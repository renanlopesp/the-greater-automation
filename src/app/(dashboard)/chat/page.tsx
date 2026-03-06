import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import NewChatClient from '@/components/chat/new-chat-client'

export default async function ChatPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) redirect('/dashboard')

  const { data: orchestrator } = await supabase
    .from('agents')
    .select('id')
    .eq('team_id', teamId)
    .eq('is_orchestrator', true)
    .limit(1)
    .single()

  return <NewChatClient orchestratorId={orchestrator?.id ?? null} />
}
