import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { safeError } from '@/lib/safe-error'

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
