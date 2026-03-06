import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { fetchAgentsWithSkills } from '@/lib/queries/dashboard'
import { getActiveTeamId } from '@/lib/get-active-team'
import AgentsDiscoverClient from '@/components/agents/agents-discover-client'

export default async function AgentsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) redirect('/dashboard')

  const agents = await fetchAgentsWithSkills(supabase, teamId)

  const agentItems = agents
    .filter((a) => !a.is_orchestrator)
    .map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      is_active: a.is_active ?? false,
      palette: a.palette,
    }))

  return <AgentsDiscoverClient agents={agentItems} />
}
