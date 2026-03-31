import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { safeError } from '@/lib/safe-error'

/**
 * POST /api/tasks — Create a new task with its conversation.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const serviceClient = createServiceRoleClient()

  // 1. Authenticate
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get team
  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  // 3. Parse body
  const body = await request.json()
  const message = body.message as string | undefined
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  try {
    // 4. Create task row
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
      })
      .select('id')
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { error: safeError('tasks-create', taskError, 'Failed to create task') },
        { status: 500 }
      )
    }

    // 5. Create conversation linked to task
    const { data: conversation, error: convError } = await (
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

    if (convError || !conversation) {
      return NextResponse.json(
        { error: safeError('tasks-create-conv', convError, 'Failed to create conversation') },
        { status: 500 }
      )
    }

    // 6. Update task with conversation_id
    await (
      serviceClient as unknown as {
        from: (t: string) => {
          update: (d: unknown) => {
            eq: (k: string, v: string) => Promise<unknown>
          }
        }
      }
    )
      .from('tasks')
      .update({ conversation_id: conversation.id })
      .eq('id', task.id)

    // 7. Return IDs — initial message is NOT stored here.
    // The chat hook uses initialQuery to auto-send it to /api/chat,
    // which handles both storing the message and triggering the AI response.
    return NextResponse.json({ taskId: task.id, conversationId: conversation.id })
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

  // 1. Authenticate
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get team
  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  try {
    // 3. Query tasks
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
