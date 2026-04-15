import { redirect, notFound } from 'next/navigation'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import StudioTaskClient from '@/components/asset-studio/StudioTaskClient'

export default async function StudioTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) redirect('/onboarding')

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

  let initialMessages: {
    id: string
    role: string
    content: string
    metadata?: Record<string, unknown>
  }[] = []

  if (task.conversation_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: msgs } = await (serviceClient as any)
      .from('conversation_messages')
      .select('id, role, content, metadata')
      .eq('conversation_id', task.conversation_id)
      .order('created_at', { ascending: true })
      .limit(50)

    if (msgs) {
      initialMessages = msgs as typeof initialMessages
    }
  }

  return (
    <StudioTaskClient
      task={{
        id: task.id,
        title: task.title,
        status: task.status,
        active_skill: task.active_skill,
        skill_status: task.skill_status,
        artifact_type: task.artifact_type,
        artifact_data: task.artifact_data,
        conversation_id: task.conversation_id,
        initial_message: task.initial_message,
      }}
      initialMessages={initialMessages}
    />
  )
}
