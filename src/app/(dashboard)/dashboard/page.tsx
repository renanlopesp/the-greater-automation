import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { fetchTeam, fetchAgentsWithSkills } from '@/lib/queries/dashboard'
import HomeClientNew from '@/components/home/home-client-new'
import type { AgentCard } from '@/data/home-dashboard'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">
          Nenhuma equipe encontrada. Entre em contato com o suporte.
        </p>
      </div>
    )
  }

  // Fetch all data in parallel — including user profile for name and app connections
  const [team, agentsWithSkills, profile, appConnectionsResult] = await Promise.all([
    fetchTeam(supabase, teamId),
    fetchAgentsWithSkills(supabase, teamId),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
      .then((r) => r.data),
    supabase.from('app_connections').select('app_id').eq('team_id', teamId),
  ])

  const userName =
    profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? undefined

  // Transform real agents into AgentCard shape (exclude orchestrator — it's the AskBar, not a co-worker)
  const agentCards: AgentCard[] = agentsWithSkills
    .filter((a) => !a.is_orchestrator)
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      emoji: '🤖',
      avatarUrl: agent.avatar_url || undefined,
      badge: {
        label: agent.is_active ? 'Ativo' : 'Inativo',
        color: agent.is_active ? ('green' as const) : ('neutral' as const),
      },
      pulse: agent.is_active ?? false,
      inactive: !agent.is_active,
      stat1: agent.description ?? '',
      stat2: `${agent.skillCount} skill${agent.skillCount !== 1 ? 's' : ''}`,
      stat3: `${agent.skills?.length ?? 0} workflow${(agent.skills?.length ?? 0) !== 1 ? 's' : ''}`,
      summary: agent.description ?? 'Sem descrição',
      kpis: [
        { label: 'Workflows', value: String(agent.skills?.length ?? 0) },
        { label: 'Skills', value: String(agent.skillCount ?? 0) },
      ],
      actions: [],
    }))

  const orchestrator = agentsWithSkills.find((a) => a.is_orchestrator)

  // Collect connected app IDs and installed agent types for recommendations
  const connectedAppIds = (appConnectionsResult.data ?? []).map((r) => r.app_id)
  const installedAgentTypes = agentsWithSkills
    .filter((a) => !a.is_orchestrator)
    .flatMap((a) => {
      const types: string[] = [a.id]
      const agentType = (a as Record<string, unknown>).agent_type as string | undefined
      if (agentType) types.push(agentType)
      return types
    })

  return (
    <HomeClientNew
      agents={agentCards.length > 0 ? agentCards : undefined}
      teamName={team?.name ?? undefined}
      userName={userName}
      orchestratorId={orchestrator?.id}
      installedAgentTypes={installedAgentTypes}
      connectedAppIds={connectedAppIds}
    />
  )
}
