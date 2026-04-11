'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getActiveConversation } from '@/lib/queries/agent-conversations'

export interface AgentModalData {
  conversationId: string | null
  messages: Array<{
    id: string
    role: string
    content: string
    sender_id: string | null
    sender_name: string | null
    sender_avatar: string | null
  }>
  connectedApps: Array<{
    app_id: string
    account_label: string | null
  }>
  conversationStarters: string[]
  currentUserId: string
  triggerSubscriptions: Array<{
    id: string
    agent_workflow_id: string
    trigger_slug: string
    app_id: string
    is_enabled: boolean
    last_event_at: string | null
    event_count: number
  }>
}

export async function getAgentModalData(agentId: string): Promise<AgentModalData | null> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch agent metadata (for conversation_starters, team_id, is_orchestrator)
  const { data: agent } = await supabase
    .from('agents')
    .select('team_id, is_orchestrator, conversation_starters')
    .eq('id', agentId)
    .single()

  if (!agent) return null

  // Parallel fetch: conversation, connections, trigger subs, store
  const [activeConversation, connectionsResult, triggerSubsResult, storeResult] = await Promise.all(
    [
      getActiveConversation(supabase, agentId, user.id),
      supabase.from('app_connections').select('id, app_id, account_label').eq('user_id', user.id),
      supabase
        .from('trigger_subscriptions')
        .select(
          'id, agent_workflow_id, trigger_slug, app_id, is_enabled, last_event_at, event_count'
        )
        .eq('agent_id', agentId),
      supabase
        .from('stores')
        .select('platform, platform_store_id')
        .eq('team_id', agent.team_id)
        .limit(1)
        .maybeSingle(),
    ]
  )

  // Derive which app_ids this agent uses (from trigger subs + store platform)
  const usedAppIds = new Set<string>()
  for (const ts of triggerSubsResult.data ?? []) {
    if (ts.app_id) usedAppIds.add(ts.app_id)
  }

  // Also include the team's store platform (e.g. Shopify connected via Composio)
  const storeRow = storeResult.data
  if (storeRow?.platform && storeRow.platform !== 'manual' && storeRow.platform_store_id) {
    usedAppIds.add(storeRow.platform)
  }

  // Build connected apps: prefer DB records, fall back to derived used apps
  const dbConnections = (connectionsResult.data ?? []).map((c) => ({
    app_id: c.app_id,
    account_label: c.account_label,
  }))
  const connectedApps =
    usedAppIds.size > 0
      ? dbConnections.filter((c) => usedAppIds.has(c.app_id)).length > 0
        ? dbConnections.filter((c) => usedAppIds.has(c.app_id))
        : [...usedAppIds].map((appId) => ({ app_id: appId, account_label: null }))
      : []

  // Conversation starters
  const orchestratorStarters = [
    'Como está meu estoque?',
    'Vendas de hoje',
    'Previsão de demanda',
    'Pedidos recentes',
  ]
  const conversationStarters = agent.is_orchestrator
    ? orchestratorStarters
    : Array.isArray(agent.conversation_starters)
      ? (agent.conversation_starters as string[])
      : []

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

  return {
    conversationId: activeConversation?.conversationId ?? null,
    messages: activeConversation?.messages ?? [],
    connectedApps,
    conversationStarters,
    currentUserId: user.id,
    triggerSubscriptions,
  }
}
