import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { fetchTeamWorkflows } from '@/lib/queries/agents'
import AgentForm from '@/components/agent-detail/agent-form'
import { getActiveTeamId } from '@/lib/get-active-team'

export default async function NewAgentPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user's active team (respects workspace switcher cookie)
  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) redirect('/dashboard')

  const workflows = await fetchTeamWorkflows(supabase, teamId)

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AgentForm mode="create" workflows={workflows} teamId={teamId} userId={user.id} />
    </div>
  )
}
