import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { fetchTeamWorkflows } from '@/lib/queries/agents'
import AgentForm from '@/components/agent-detail/agent-form'

export default async function NewAgentPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: memberRows } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)

  const teamId = memberRows?.[0]?.team_id
  if (!teamId) redirect('/dashboard')

  const workflows = await fetchTeamWorkflows(supabase, teamId)

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AgentForm mode="create" workflows={workflows} teamId={teamId} userId={user.id} />
    </div>
  )
}
