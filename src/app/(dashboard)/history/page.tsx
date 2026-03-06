import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import HistoryClient from '@/components/history/history-client'

export default async function HistoryPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) redirect('/dashboard')

  // Fetch all conversations for the team, with the first user message as title
  const { data: conversations } = await supabase
    .from('agent_conversations')
    .select('id, agent_id, title, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(100)

  const items = (conversations ?? []).map((c) => ({
    id: c.id,
    agentId: c.agent_id,
    title: c.title ?? 'Untitled conversation',
    createdAt: c.created_at ?? new Date().toISOString(),
  }))

  return <HistoryClient conversations={items} />
}
