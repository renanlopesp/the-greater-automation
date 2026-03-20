import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import HistoryClient from '@/components/history/history-client'

export default async function HistoryPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const teamId = await getActiveTeamId(supabase, user.id)

  // Find the orchestrator agent for this team so we can filter conversations to it
  let orchestratorId: string | null = null
  if (teamId) {
    const { data: orchestrator } = await supabase
      .from('agents')
      .select('id')
      .eq('team_id', teamId)
      .eq('is_orchestrator', true)
      .limit(1)
      .single()
    orchestratorId = orchestrator?.id ?? null
  }

  let conversationsQuery = supabase
    .from('agent_conversations')
    .select('id, title, is_active, created_at, updated_at, agent_id, agents(name, palette)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  // Filter to orchestrator conversations when we know the orchestrator ID
  if (orchestratorId) {
    conversationsQuery = conversationsQuery.eq('agent_id', orchestratorId)
  }

  const { data: conversations } = await conversationsQuery

  return <HistoryClient conversations={conversations ?? []} />
}
