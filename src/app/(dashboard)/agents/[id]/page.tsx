import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveConversation } from '@/lib/queries/agent-conversations'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import AgentAvatar from '@/components/agent-detail/agent-avatar'
import AgentStatus from '@/components/agent-detail/agent-status'
import NewChatButton from '@/components/agent-detail/new-chat-button'
import ChatHistoryButton from '@/components/agent-detail/chat-history-button'
import PresenceIndicator from '@/components/agent-detail/presence-indicator'
import ChatPanel from '@/components/agent-detail/chat-panel'
import AgentSidebar from '@/components/agent-detail/agent-sidebar'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  // Parallel: auth + agent + profile + conversation — no dependency between them
  const [
    {
      data: { user },
    },
    { data: agent },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('agents').select('*').eq('id', id).single(),
  ])

  if (!user) redirect('/login')
  if (!agent) notFound()

  // Parallel: profile + conversation history (both depend on user/agent being resolved)
  const [{ data: profile }, activeConversation] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url').eq('id', user.id).single(),
    getActiveConversation(supabase, id),
  ])

  const currentUser = {
    id: user.id,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      {/* Compact agent header */}
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to dashboard</TooltipContent>
          </Tooltip>
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
          <PresenceIndicator agentId={id} currentUser={currentUser} />
          <Suspense
            fallback={
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" disabled>
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            }
          >
            <AgentSidebarData agentId={id} userId={user.id} teamId={agent.team_id} />
          </Suspense>
          <ChatHistoryButton agentId={id} />
          <NewChatButton />
        </div>
      </header>

      {/* Chat takes all remaining space — history loaded on server, no client useEffect */}
      <ChatPanel
        agentId={id}
        agentName={agent.name}
        agentPalette={agent.palette}
        conversationStarters={
          Array.isArray(agent.conversation_starters)
            ? (agent.conversation_starters as string[])
            : []
        }
        currentUserId={user.id}
        initialConversationId={activeConversation?.conversationId ?? null}
        initialMessages={activeConversation?.messages ?? []}
      />
    </div>
  )
}

/** Async Server Component — sidebar data fetched independently, streamed via Suspense */
async function AgentSidebarData({
  agentId,
  userId,
  teamId,
}: {
  agentId: string
  userId: string
  teamId: string
}) {
  const supabase = await createServerClient()

  const [workflowsResult, recentRunsResult, connectionsResult, skillsResult, triggerSubsResult] =
    await Promise.all([
      supabase
        .from('agent_workflows')
        .select(
          'id, name, description, source, last_run_at, workflow_id, action_template, trigger_config, conditions, actions, is_enabled, execution_mode, run_count, workflows(name, emoji)'
        )
        .eq('agent_id', agentId)
        .order('created_at', { ascending: true }),

      supabase
        .from('workflow_runs')
        .select(
          'id, status, steps_used, ai_credits_used, started_at, completed_at, trigger_data, trigger_type, error, workflow_id, workflows(name, emoji)'
        )
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(20),

      supabase.from('app_connections').select('id, app_id, account_label').eq('user_id', userId),

      supabase
        .from('agent_skills')
        .select('id, name, description, content, source, is_enabled, type, parameters, version')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: true }),

      supabase
        .from('trigger_subscriptions')
        .select(
          'id, agent_workflow_id, trigger_slug, app_id, is_enabled, last_event_at, event_count'
        )
        .eq('agent_id', agentId),
    ])

  // Transform workflows
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

  // Derive which app_ids this agent uses
  const usedAppIds = new Set<string>()
  for (const w of workflowsResult.data ?? []) {
    const tc = w.trigger_config as Record<string, unknown> | null
    if (tc?.type === 'app_event' && typeof tc.app_id === 'string') {
      usedAppIds.add(tc.app_id)
    }
    if (Array.isArray(w.actions)) {
      for (const a of w.actions as Array<Record<string, unknown>>) {
        if (a.type === 'composio_action' && typeof a.app_id === 'string') {
          usedAppIds.add(a.app_id)
        }
      }
    }
  }
  for (const ts of triggerSubsResult.data ?? []) {
    if (ts.app_id) usedAppIds.add(ts.app_id)
  }

  // Build connected apps: prefer DB records, fall back to derived used apps
  const dbConnections = (connectionsResult.data ?? []).map((c) => ({
    app_id: c.app_id,
    account_label: c.account_label,
  }))
  const filteredDbConnections =
    usedAppIds.size > 0 ? dbConnections.filter((c) => usedAppIds.has(c.app_id)) : dbConnections
  // If no DB connections, show apps derived from workflows/triggers/subscriptions
  const connectedApps =
    filteredDbConnections.length > 0
      ? filteredDbConnections
      : [...usedAppIds].map((appId) => ({ app_id: appId, account_label: null }))

  // Transform runs — unified from workflow_runs (both agent and visual workflows)
  const allRuns = (recentRunsResult.data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    steps_used: r.steps_used,
    ai_credits_used: Number(r.ai_credits_used),
    started_at: r.started_at ?? '',
    completed_at: r.completed_at,
    workflow: r.workflows as { name: string; emoji: string } | null,
    trigger_data: r.trigger_data as Record<string, unknown> | null,
    trigger_type: r.trigger_type,
    error: r.error,
    event_log_id: (r.trigger_data as Record<string, unknown> | null)?.event_log_id as
      | string
      | undefined,
  }))

  // Transform skills
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

  // Transform trigger subscriptions
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
    <AgentSidebar
      agentId={agentId}
      teamId={teamId}
      initialWorkflows={workflows}
      skills={skills}
      connectedApps={connectedApps}
      allRuns={allRuns}
      triggerSubscriptions={triggerSubscriptions}
    />
  )
}
