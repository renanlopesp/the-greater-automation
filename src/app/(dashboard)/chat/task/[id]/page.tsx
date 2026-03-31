import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import TaskPageClient from '@/components/chat/task-page-client'

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 1. Authenticate
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 2. Get team
  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) redirect('/onboarding')

  // 3. Fetch task
  const serviceClient = createServiceRoleClient()

  const { data: task } = await (
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
                } | null
              }>
            }
          }
        }
      }
    }
  )
    .from('tasks')
    .select(
      'id, title, status, active_skill, skill_status, artifact_type, artifact_data, conversation_id, initial_message'
    )
    .eq('id', id)
    .eq('team_id', teamId)
    .single()

  if (!task) notFound()

  // 4. Fetch conversation messages
  let initialMessages: { id: string; role: string; content: string }[] = []

  if (task.conversation_id) {
    const { data: msgs } = await (
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
                  data: Array<{ id: string; role: string; content: string }> | null
                }>
              }
            }
          }
        }
      }
    )
      .from('conversation_messages')
      .select('id, role, content')
      .eq('conversation_id', task.conversation_id)
      .order('created_at', { ascending: true })
      .limit(50)

    if (msgs) {
      initialMessages = msgs
    }
  }

  // 5. Render
  return (
    <TaskPageClient
      task={{
        id: task.id,
        title: task.title,
        status: task.status,
        active_skill: task.active_skill,
        skill_status: task.skill_status,
        artifact_type: task.artifact_type,
        artifact_data: task.artifact_data,
        conversation_id: task.conversation_id,
      }}
      initialConversationId={task.conversation_id}
      initialMessages={initialMessages}
      initialQuery={initialMessages.length === 0 ? (task.initial_message ?? undefined) : undefined}
    />
  )
}
