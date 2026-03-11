import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { fetchTeam, fetchAgentsWithSkills, fetchRunsToday } from '@/lib/queries/dashboard'
import HomeClientNew from '@/components/home/home-client-new'
import type { AgentCard, Metric } from '@/data/home-dashboard'

// Available avatar JPGs in public/images/coworker-avatars/
const avatarSlugs = [
  'customer-service',
  'upsell-retention',
  'review-reputation',
  'churn-prediction',
  'vip-relationship',
  'sentiment-intelligence',
  'conversion-optimizer',
  'retention-booster',
  'ad-waste-detector',
  'content-engine',
  'email-performance',
  'competitor-watch',
  'pricing-intelligence',
  'market-gap-finder',
  'share-of-voice',
  'revenue-intelligence',
  'cohort-analyzer',
  'funnel-diagnostics',
  'attribution-mapper',
  'store-audit-scanner',
  'checkout-auditor',
  'data-quality-guard',
  'compliance-scanner',
  'task-prioritizer',
  'weekly-briefing',
  'workflow-automator',
  'inventory-alerts',
]

/** Pick a deterministic avatar for any agent name */
function pickAvatar(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  const idx = Math.abs(hash) % avatarSlugs.length
  return `/images/coworker-avatars/${avatarSlugs[idx]}.jpg`
}

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

  // Transform real agents into AgentCard shape (exclude orchestrator — it's the AskBar, not a co-worker)
  const agentCards: AgentCard[] = agentsWithSkills
    .filter((a) => !a.is_orchestrator)
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      emoji: '🤖',
      avatarUrl: agent.avatar_url || pickAvatar(agent.name),
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
      label: 'home.metrics.activeAgents',
      value: String(activeAgentCount),
      sub: activeAgentCount > 0 ? 'home.metrics.operating' : 'home.metrics.noneActive',
      pulse: activeAgentCount > 0,
    },
    {
      label: 'home.metrics.executionsToday',
      value: String(runsToday),
      sub: 'home.metrics.workflowRuns',
    },
    {
      label: 'home.metrics.workflows',
      value: String(totalWorkflows),
      sub: 'home.metrics.configured',
    },
    {
      label: 'home.metrics.skills',
      value: String(totalSkills),
      sub: 'home.metrics.available',
    },
    {
      label: 'home.metrics.coworkers',
      value: String(agentsWithSkills.length),
      sub: 'home.metrics.inTeam',
    },
  ]

  const orchestrator = agentsWithSkills.find((a) => a.is_orchestrator)

  return (
    <HomeClientNew
      agents={agentCards.length > 0 ? agentCards : undefined}
      metrics={metrics}
      teamName={team?.name ?? undefined}
      userName={userName}
      orchestratorId={orchestrator?.id}
    />
  )
}
