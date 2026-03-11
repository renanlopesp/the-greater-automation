import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { fetchTeam, fetchAgentsWithSkills, fetchRunsToday } from '@/lib/queries/dashboard'
import HomeClientNew from '@/components/home/home-client-new'
import type { AgentCard, Metric } from '@/data/home-dashboard'

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

  // Fetch all data in parallel — including user profile for name
  const [team, agentsWithSkills, runsToday, profile] = await Promise.all([
    fetchTeam(supabase, teamId),
    fetchAgentsWithSkills(supabase, teamId),
    fetchRunsToday(supabase, teamId),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
      .then((r) => r.data),
  ])

  const userName =
    profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? undefined

  // Transform real agents into AgentCard shape
  const agentCards: AgentCard[] = agentsWithSkills.map((agent) => ({
    id: agent.id,
    name: agent.name,
    emoji: '🤖',
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

  // Build real metrics from database data
  const activeAgentCount = agentsWithSkills.filter((a) => a.is_active).length
  const totalSkills = agentsWithSkills.reduce((acc, a) => acc + (a.skillCount ?? 0), 0)
  const totalWorkflows = agentsWithSkills.reduce((acc, a) => acc + (a.skills?.length ?? 0), 0)

  const metrics: Metric[] = [
    {
      label: 'Agentes ativos agora',
      value: String(activeAgentCount),
      sub: activeAgentCount > 0 ? 'operando' : 'nenhum ativo',
      pulse: activeAgentCount > 0,
    },
    {
      label: 'Execuções hoje',
      value: String(runsToday),
      sub: 'workflow runs',
    },
    {
      label: 'Workflows',
      value: String(totalWorkflows),
      sub: 'configurados',
    },
    {
      label: 'Skills',
      value: String(totalSkills),
      sub: 'disponíveis',
    },
    {
      label: 'Co-workers',
      value: String(agentsWithSkills.length),
      sub: 'no time',
    },
  ]

  return (
    <HomeClientNew
      agents={agentCards.length > 0 ? agentCards : undefined}
      metrics={metrics}
      teamName={team?.name ?? undefined}
      userName={userName}
    />
  )
}
