import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { safeError } from '@/lib/safe-error'

/**
 * PATCH /api/tasks/[id] — Update task artifact_data.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const serviceClient = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return NextResponse.json({ error: 'No team found' }, { status: 400 })

  try {
    const body = await request.json()
    const { artifact_data } = body as { artifact_data?: unknown }

    if (!artifact_data) {
      return NextResponse.json({ error: 'artifact_data is required' }, { status: 400 })
    }

    await (
      serviceClient as unknown as {
        from: (t: string) => {
          update: (d: unknown) => {
            eq: (
              k: string,
              v: string
            ) => {
              eq: (k: string, v: string) => Promise<{ error: unknown }>
            }
          }
        }
      }
    )
      .from('tasks')
      .update({ artifact_data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('team_id', teamId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('tasks-patch', error, 'Failed to update task') },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tasks/[id] — Delete a task and its conversation.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const serviceClient = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return NextResponse.json({ error: 'No team found' }, { status: 400 })

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sc = serviceClient as any

    // 1. Find conversations for this task
    const { data: convs } = await sc.from('conversations').select('id').eq('task_id', id)
    const convIds = (convs ?? []).map((c: { id: string }) => c.id)

    // 2. Delete conversation_messages for those conversations
    if (convIds.length > 0) {
      await sc.from('conversation_messages').delete().in('conversation_id', convIds)
    }

    // 3. Delete conversations
    await sc.from('conversations').delete().eq('task_id', id)

    // 4. Delete the task (with team_id check)
    await sc.from('tasks').delete().eq('id', id).eq('team_id', teamId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('tasks-delete', error, 'Failed to delete task') },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tasks/[id] — Get a single task with full artifact data.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    // 3. Query task by id with team_id check
    const { data: task, error } = await (
      serviceClient as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              k: string,
              v: string
            ) => {
              eq: (
                k: string,
                v: string
              ) => {
                single: () => Promise<{
                  data: {
                    id: string
                    title: string
                    status: string
                    active_skill: string | null
                    skill_status: string | null
                    artifact_type: string | null
                    artifact_data: unknown
                    conversation_id: string | null
                    initial_message: string | null
                    created_at: string
                    updated_at: string
                  } | null
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
        'id, title, status, active_skill, skill_status, artifact_type, artifact_data, conversation_id, initial_message, created_at, updated_at'
      )
      .eq('id', id)
      .eq('team_id', teamId)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('tasks-get', error, 'Failed to get task') },
      { status: 500 }
    )
  }
}
