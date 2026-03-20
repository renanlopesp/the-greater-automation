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
  let installedTypes: string[] = []
  let installedTypeToAgentId: Record<string, string> = {}

  if (teamId) {
    const { data: rows } = await supabase
      .from('agents')
      .select('id, is_active, is_orchestrator')
      .eq('team_id', teamId)

    const allAgents = rows ?? []

    activeIds = allAgents.filter((r) => r.is_active && !r.is_orchestrator).map((r) => r.id)

    // Query installed agent_types for duplicate install prevention (T019)
    // agent_type column was added in migration; cast to bypass PostgREST schema cache
    const { data: typedAgents } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              k: string,
              v: unknown
            ) => {
              not: (
                k: string,
                op: string,
                v: null
              ) => Promise<{
                data: Array<{ id: string; agent_type: string }> | null
              }>
            }
          }
        }
      }
    )
      .from('agents')
      .select('id, agent_type')
      .eq('team_id', teamId)
      .not('agent_type', 'is', null)

    installedTypes = (typedAgents ?? []).map((r) => r.agent_type).filter(Boolean)

    // Build map of agent_type → agent DB id for linking to installed agent pages
    installedTypeToAgentId = Object.fromEntries(
      (typedAgents ?? []).filter((r) => r.agent_type).map((r) => [r.agent_type, r.id])
    )
  }

  return (
    <DiscoverClient
      activeIds={activeIds}
      teamId={teamId ?? ''}
      userId={user.id}
      installedTypes={installedTypes}
      installedTypeToAgentId={installedTypeToAgentId}
    />
  )
}
