import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { createServiceRoleClient } from '@/lib/supabase/server'
import OrchestratorChatWrapper from '@/components/chat/orchestrator-chat-wrapper'

export default async function ChatPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) redirect('/onboarding')

  // Load active orchestrator conversation from `conversations` table (NOT agent_conversations)
  const serviceClient = createServiceRoleClient()

  const { data: activeConv } = await (
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
              eq: (
                k: string,
                v: boolean
              ) => {
                order: (
                  k: string,
                  o: { ascending: boolean }
                ) => {
                  limit: (n: number) => {
                    single: () => Promise<{ data: { id: string } | null }>
                  }
                }
              }
            }
          }
        }
      }
    }
  )
    .from('conversations')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let initialMessages: { id: string; role: string; content: string }[] = []

  if (activeConv) {
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
      .eq('conversation_id', activeConv.id)
      .order('created_at', { ascending: true })
      .limit(50)

    if (msgs) {
      initialMessages = msgs
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <OrchestratorChatWrapper
        initialConversationId={activeConv?.id ?? null}
        initialMessages={initialMessages}
      />
    </div>
  )
}
