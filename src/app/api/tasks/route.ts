import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { safeError } from '@/lib/safe-error'

/**
 * POST /api/tasks — Create a new task with its conversation.
 * Optimized: auth+body in parallel, task update fire-and-forget.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const serviceClient = createServiceRoleClient()

  // Auth + body in parallel
  const [
    {
      data: { user },
    },
    body,
  ] = await Promise.all([supabase.auth.getUser(), request.json()])

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  const message = body.message as string | undefined
  const selectedSkill = (body.selected_skill as string | undefined) ?? null
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  try {
    // Single RPC: create task + conversation + link them (1 DB round trip instead of 3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rpcError } = await (serviceClient as any).rpc(
      'create_task_with_conversation',
      {
        p_team_id: teamId,
        p_user_id: user.id,
        p_title: message.slice(0, 60),
        p_initial_message: message,
      }
    )

    const row = Array.isArray(data) ? data[0] : data
    if (rpcError || !row?.task_id) {
      // Fallback: create task + conversation separately if RPC doesn't exist yet
      const { data: task, error: taskError } = await (
        serviceClient as unknown as {
          from: (t: string) => {
            insert: (d: unknown) => {
              select: (s: string) => {
                single: () => Promise<{ data: { id: string } | null; error: unknown }>
              }
            }
          }
        }
      )
        .from('tasks')
        .insert({
          team_id: teamId,
          user_id: user.id,
          title: message.slice(0, 60),
          status: 'active',
          initial_message: message,
          selected_skill: selectedSkill,
        })
        .select('id')
        .single()

      if (taskError || !task) {
        return NextResponse.json(
          { error: safeError('tasks-create', taskError, 'Failed to create task') },
          { status: 500 }
        )
      }

      const { data: conversation } = await (
        serviceClient as unknown as {
          from: (t: string) => {
            insert: (d: unknown) => {
              select: (s: string) => {
                single: () => Promise<{ data: { id: string } | null; error: unknown }>
              }
            }
          }
        }
      )
        .from('conversations')
        .insert({
          team_id: teamId,
          user_id: user.id,
          task_id: task.id,
          title: message.slice(0, 100),
          is_active: true,
        })
        .select('id')
        .single()

      if (conversation) {
        void (
          serviceClient as unknown as {
            from: (t: string) => {
              update: (d: unknown) => { eq: (k: string, v: string) => Promise<unknown> }
            }
          }
        )
          .from('tasks')
          .update({ conversation_id: conversation.id })
          .eq('id', task.id)
      }

      return NextResponse.json({ taskId: task.id, conversationId: conversation?.id ?? null })
    }

    // Update selected_skill on task (RPC doesn't support it yet)
    if (selectedSkill && row.task_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (serviceClient as any)
        .from('tasks')
        .update({ selected_skill: selectedSkill })
        .eq('id', row.task_id)
    }
    return NextResponse.json({ taskId: row.task_id, conversationId: row.conversation_id })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('tasks-create', error, 'Failed to create task') },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tasks — List tasks for the authenticated user's team.
 */
export async function GET() {
  const supabase = await createServerClient()
  const serviceClient = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  try {
    const { data: tasks, error } = await (
      serviceClient as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              k: string,
              v: string
            ) => {
              order: (
                k: string,
                o: { ascending: boolean }
              ) => {
                limit: (n: number) => Promise<{
                  data: Array<{
                    id: string
                    title: string
                    status: string
                    active_skill: string | null
                    skill_status: string | null
                    artifact_type: string | null
                    created_at: string
                    updated_at: string
                  }> | null
                  error: unknown
                }>
              }
            }
          }
        }
      }
    )
      .from('tasks')
      .select(
        'id, title, status, active_skill, skill_status, artifact_type, created_at, updated_at'
      )
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: safeError('tasks-list', error, 'Failed to list tasks') },
        { status: 500 }
      )
    }

    return NextResponse.json({ tasks: tasks ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('tasks-list', error, 'Failed to list tasks') },
      { status: 500 }
    )
  }
}
