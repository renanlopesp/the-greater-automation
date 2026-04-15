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

  const { data: agent } = await supabase
    .from('agents')
    .select('team_id, is_orchestrator, conversation_starters')
    .eq('id', agentId)
    .single()

  if (!agent) return null

  // Connected apps + trigger subscriptions were pared down during the
  // 2026-04-15 schema refactor: `app_connections.app_id`/`account_label`
  // and the `trigger_subscriptions` table were all dropped. The modal now
  // receives an empty list until the triggers feature is rebuilt.
  const [activeConversation, storeResult] = await Promise.all([
    getActiveConversation(supabase, agentId, user.id),
    supabase
      .from('stores')
      .select('platform, platform_store_id')
      .eq('team_id', agent.team_id)
      .limit(1)
      .maybeSingle(),
  ])

  const connectedApps: AgentModalData['connectedApps'] = []
  const storeRow = storeResult.data
  if (storeRow?.platform && storeRow.platform !== 'manual' && storeRow.platform_store_id) {
    connectedApps.push({ app_id: storeRow.platform, account_label: null })
  }

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

  return {
    conversationId: activeConversation?.conversationId ?? null,
    messages: activeConversation?.messages ?? [],
    connectedApps,
    conversationStarters,
    currentUserId: user.id,
    triggerSubscriptions: [],
  }
}
