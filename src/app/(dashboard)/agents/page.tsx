import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import DiscoverClient from '@/components/discover/discover-client'

export default async function AgentsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const teamId = await getActiveTeamId(supabase, user.id)

  // Fetch active (non-orchestrator) agent IDs from DB to mark them in the catalog
  let activeIds: string[] = []
  if (teamId) {
    const { data: rows } = await supabase
      .from('agents')
      .select('id')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .neq('is_orchestrator', true)

    activeIds = (rows ?? []).map((r) => r.id)
  }

  return <DiscoverClient activeIds={activeIds} />
}
