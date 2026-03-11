import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import NewChatClient from '@/components/chat/new-chat-client'
import type { CoworkerItem } from '@/components/chat/coworker-selector'

export default async function ChatPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const teamId = await getActiveTeamId(supabase, user.id)

  let agents: CoworkerItem[] = []

  if (teamId) {
    const { data } = await supabase
      .from('agents')
      .select('id, name, palette, is_orchestrator')
      .eq('team_id', teamId)
      .eq('is_active', true)

    if (data) {
      agents = data.map((agent) => ({
        id: agent.id,
        name: agent.name,
        emoji: agent.is_orchestrator ? '🤖' : '⚡',
      }))
    }
  }

  return <NewChatClient agents={agents} />
}
