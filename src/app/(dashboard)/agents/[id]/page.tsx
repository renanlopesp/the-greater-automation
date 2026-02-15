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

  const [
    workflowsResult,
    runsResult,
    recentRunsResult,
    connectionsResult,
    workflowRunsResult,
    skillsResult,
    triggerSubsResult,
  ] = await Promise.all([
    // Workflows (automations) with workflow info + new columns
    supabase
      .from('agent_workflows')
      .select(
        'id, name, description, source, last_run_at, workflow_id, action_template, trigger_config, conditions, actions, is_enabled, execution_mode, run_count, workflows(name, emoji)'
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

    // Workflow runs
    supabase
      .from('agent_workflow_runs')
      .select(
        'id, workflow_id, status, trigger_data, actions_executed, error, duration_ms, created_at, pipeline_steps, event_log_id, agent_workflows(name)'
      )
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(20),

    // Skills (knowledge)
    supabase
      .from('agent_skills')
      .select('id, name, description, content, source, is_enabled, type, parameters, version')
      .eq('agent_id', id)
      .order('created_at', { ascending: true }),

    // Trigger subscriptions
    supabase
      .from('trigger_subscriptions')
      .select('id, agent_workflow_id, trigger_slug, app_id, is_enabled, last_event_at, event_count')
      .eq('agent_id', id),
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

  // Transform workflows for component (include both manual and dynamic workflows)
  const workflows = (workflowsResult.data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description ?? null,
    source: w.source ?? null,
    last_run_at: w.last_run_at,
    workflow_id: w.workflow_id ?? undefined,
    workflow: w.workflow_id ? (w.workflows as { name: string; emoji: string } | null) : null,
    action_template: w.action_template as Record<string, unknown> | null,
    trigger_config: w.trigger_config as Record<string, unknown> | null,
    conditions: Array.isArray(w.conditions) ? w.conditions : undefined,
    actions: Array.isArray(w.actions) ? w.actions : undefined,
    is_enabled: w.is_enabled ?? undefined,
    execution_mode: w.execution_mode ?? undefined,
    run_count: w.run_count ?? undefined,
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

  // Transform workflow runs for component
  const workflowRuns = (workflowRunsResult.data ?? []).map((r) => ({
    id: r.id,
    workflow_id: r.workflow_id,
    status: r.status,
    trigger_data: r.trigger_data as Record<string, unknown> | null,
    actions_executed: Array.isArray(r.actions_executed) ? r.actions_executed : null,
    error: r.error,
    duration_ms: r.duration_ms,
    created_at: r.created_at ?? new Date().toISOString(),
    agent_workflows: r.agent_workflows as { name: string } | null,
    pipeline_steps: Array.isArray(r.pipeline_steps) ? r.pipeline_steps : null,
    event_log_id: r.event_log_id,
  }))

  // Transform skills (knowledge) for component
  const skills = (skillsResult.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    content: s.content,
    source: s.source,
    is_enabled: s.is_enabled,
    type: s.type,
    parameters: s.parameters,
    version: s.version,
  }))

  // Transform trigger subscriptions for component
  const triggerSubscriptions = (triggerSubsResult.data ?? []).map((ts) => ({
    id: ts.id,
    agent_workflow_id: ts.agent_workflow_id,
    trigger_slug: ts.trigger_slug,
    app_id: ts.app_id,
    is_enabled: ts.is_enabled,
    last_event_at: ts.last_event_at,
    event_count: ts.event_count,
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
            initialWorkflows={workflows}
            skills={skills}
            connectedApps={connectedApps}
            recentRuns={recentRuns}
            workflowRuns={workflowRuns}
            triggerSubscriptions={triggerSubscriptions}
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
