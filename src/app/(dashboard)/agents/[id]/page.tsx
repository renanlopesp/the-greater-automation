import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { subMonths, format } from 'date-fns'
import { Pencil, ArrowLeft } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import AgentAvatar from '@/components/agent-detail/agent-avatar'
import AgentStatus from '@/components/agent-detail/agent-status'
import ChatPanel from '@/components/agent-detail/chat-panel'
import AgentSidebar from '@/components/agent-detail/agent-sidebar'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch agent
  const { data: agent } = await supabase.from('agents').select('*').eq('id', id).single()

  if (!agent) notFound()

  // Parallel data fetching
  const sixMonthsAgo = subMonths(new Date(), 6)

  const [skillsResult, runsResult, recentRunsResult, connectionsResult] = await Promise.all([
    // Skills with workflow info
    supabase
      .from('agent_skills')
      .select(
        'id, name, description, source, last_run_at, workflow_id, action_template, workflows(name, emoji)'
      )
      .eq('agent_id', id)
      .order('created_at', { ascending: true }),

    // Runs for heatmap (last 6 months)
    supabase
      .from('workflow_runs')
      .select('started_at')
      .eq('agent_id', id)
      .gte('started_at', sixMonthsAgo.toISOString())
      .order('started_at', { ascending: false }),

    // Recent runs for history
    supabase
      .from('workflow_runs')
      .select(
        'id, status, steps_used, ai_credits_used, started_at, completed_at, workflow_id, workflows(name, emoji)'
      )
      .eq('agent_id', id)
      .order('started_at', { ascending: false })
      .limit(20),

    // User's app connections
    supabase.from('app_connections').select('id, app_id, account_label').eq('user_id', user.id),
  ])

  // Build heatmap data
  const heatmapData = new Map<string, number>()
  if (runsResult.data) {
    for (const run of runsResult.data) {
      if (run.started_at) {
        const day = format(new Date(run.started_at), 'yyyy-MM-dd')
        heatmapData.set(day, (heatmapData.get(day) ?? 0) + 1)
      }
    }
  }

  // Transform skills for component (include both manual and dynamic skills)
  const skills = (skillsResult.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    source: s.source ?? null,
    last_run_at: s.last_run_at,
    workflow_id: s.workflow_id,
    workflow: s.workflow_id ? (s.workflows as { name: string; emoji: string } | null) : null,
    action_template: s.action_template as Record<string, unknown> | null,
  }))

  // Transform app connections for component
  const connectedApps = (connectionsResult.data ?? []).map((c) => ({
    app_id: c.app_id,
    account_label: c.account_label,
  }))

  // Transform recent runs for component
  const recentRuns = (recentRunsResult.data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    steps_used: r.steps_used,
    ai_credits_used: Number(r.ai_credits_used),
    started_at: r.started_at ?? '',
    completed_at: r.completed_at,
    workflow: r.workflows as { name: string; emoji: string } | null,
  }))

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      {/* Compact agent header */}
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <AgentAvatar name={agent.name} palette={agent.palette} size={32} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-sm font-semibold">{agent.name}</h1>
              <AgentStatus status={agent.status} isActive={agent.is_active} />
            </div>
            {agent.description && (
              <p className="text-muted-foreground truncate text-xs">{agent.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 rounded-full" asChild>
            <Link href={`/agents/${id}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
          <AgentSidebar
            agentId={id}
            teamId={agent.team_id}
            skills={skills}
            connectedApps={connectedApps}
            recentRuns={recentRuns}
            heatmapData={heatmapData}
          />
        </div>
      </header>

      {/* Chat takes all remaining space */}
      <ChatPanel
        agentId={id}
        agentName={agent.name}
        agentPalette={agent.palette}
        conversationStarters={
          Array.isArray(agent.conversation_starters)
            ? (agent.conversation_starters as string[])
            : []
        }
      />
    </div>
  )
}
