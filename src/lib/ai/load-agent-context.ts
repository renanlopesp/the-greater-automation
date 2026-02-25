import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import {
  buildAgentSystemPrompt,
  type AgentConfig,
  type AgentSkill,
  type ConnectedApp,
} from '@/lib/ai/agent-chat'
import { buildSkillBuilderTools } from '@/lib/ai/skill-builder-tools'
import { buildRetailTools } from '@/lib/ai/retail-tools'

type Client = SupabaseClient<Database>

export interface AgentContext {
  agent: Database['public']['Tables']['agents']['Row']
  agentConfig: AgentConfig
  systemPrompt: string
  relayTools: Record<string, unknown>
  connectedAppIds: string[]
  connectedAccountMap: Record<string, string> | undefined
  composioEntityId: string
  storeId: string | null
}

/**
 * Load everything needed to run an agent chat: config, skills, connections,
 * tools, and system prompt. Shared between the chat API route and
 * SNEW_ASK_AGENT (orchestrator delegation).
 */
export async function loadAgentContext(
  supabase: Client,
  agentId: string,
  userId: string,
  teamId: string,
  opts?: { imageAttachments?: Array<{ url: string; mediaType: string }> }
): Promise<AgentContext | null> {
  // Parallel queries — all independent
  const [
    { data: agent },
    { data: skillRows },
    { data: knowledgeSkillRows },
    { data: rpcConnections },
  ] = await Promise.all([
    supabase.from('agents').select('*').eq('id', agentId).single(),
    supabase.from('agent_workflows').select('*').eq('agent_id', agentId),
    supabase
      .from('agent_skills')
      .select('id, name, type, description, is_enabled')
      .eq('agent_id', agentId),
    supabase.rpc('get_agent_available_connections', { p_agent_id: agentId, p_user_id: userId }),
  ])

  if (!agent) return null

  const agentConfig: AgentConfig = {
    id: agent.id,
    name: agent.name,
    system_prompt: agent.system_prompt,
    model: agent.model,
    temperature: agent.temperature,
    max_tokens: agent.max_tokens,
  }

  // Transform skills
  const allSkills: AgentSkill[] = (skillRows ?? []).map((s) => ({
    name: s.name,
    description: s.description,
    source: s.source,
    action_template: s.action_template as Record<string, unknown> | null,
    workflow_name: null,
    workflow_description: null,
  }))
  const staticSkills = allSkills.filter((s) => s.source !== 'dynamic')
  const dynamicSkills = allSkills.filter((s) => s.source === 'dynamic')
  const knowledgeSkills = (knowledgeSkillRows ?? []).map((s) => ({
    name: s.name,
    type: s.type,
    description: s.description,
    is_enabled: s.is_enabled ?? true,
  }))

  // Connected apps
  const rpcRows = (rpcConnections ?? []) as Array<{ app_id: string; is_own_connection: boolean }>
  const ownConnections = rpcRows.filter((r) => r.is_own_connection)
  const connectedApps: ConnectedApp[] = (ownConnections.length > 0 ? ownConnections : rpcRows).map(
    (conn) => ({ appId: conn.app_id, actions: [] })
  )

  // Determine which Composio apps this agent uses
  const agentAppIds = new Set<string>()
  for (const s of skillRows ?? []) {
    if (Array.isArray(s.actions)) {
      for (const a of s.actions as Array<Record<string, unknown>>) {
        if (a.type === 'composio_action' && typeof a.app_id === 'string') {
          agentAppIds.add(a.app_id)
        }
      }
    }
    const tc = s.trigger_config as Record<string, unknown> | null
    if (tc?.type === 'app_event' && typeof tc.app_id === 'string') {
      agentAppIds.add(tc.app_id)
    }
  }
  for (const app of connectedApps) {
    agentAppIds.add(app.appId)
  }

  // Store detection
  let storeId: string | null = null
  if (agent.team_id) {
    const { data: store } = await supabase
      .from('stores')
      .select('id, platform, platform_store_id')
      .eq('team_id', agent.team_id)
      .limit(1)
      .single()

    if (store) {
      storeId = store.id
      if (store.platform && store.platform !== 'manual' && store.platform_store_id) {
        if (store.platform !== 'nuvemshop') {
          agentAppIds.add(store.platform)
        }
      }
    }
  }

  const hasComposioApps = agentAppIds.size > 0

  // Connected account map for Composio session
  let connectedAccountMap: Record<string, string> | undefined
  let composioEntityId = userId
  if (hasComposioApps) {
    const userIds = [userId]
    if (agent.team_id) {
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', agent.team_id)
      if (members) {
        for (const m of members) {
          if (m.user_id !== userId) userIds.push(m.user_id)
        }
      }
    }

    const { data: connRows } = await supabase
      .from('app_connections')
      .select('app_id, composio_connection_id, user_id')
      .in('user_id', userIds)
      .in('app_id', [...agentAppIds])
    if (connRows && connRows.length > 0) {
      connectedAccountMap = {}
      const ownerCounts = new Map<string, number>()
      for (const row of connRows) {
        if (row.composio_connection_id) {
          if (!connectedAccountMap[row.app_id] || row.user_id === userId) {
            connectedAccountMap[row.app_id] = row.composio_connection_id
          }
          ownerCounts.set(row.user_id, (ownerCounts.get(row.user_id) ?? 0) + 1)
        }
      }
      if (!ownerCounts.has(userId) && ownerCounts.size > 0) {
        let maxCount = 0
        for (const [ownerId, count] of ownerCounts) {
          if (count > maxCount) {
            maxCount = count
            composioEntityId = ownerId
          }
        }
      }
    }
  }

  // Build relay tools
  const needsWorkflowTools = hasComposioApps || !!storeId
  const relayTools: Record<string, unknown> = {
    ...buildSkillBuilderTools(agentId, userId, agent.team_id, needsWorkflowTools ? 'full' : 'chat'),
    ...(storeId && agent.team_id
      ? buildRetailTools(storeId, agent.team_id, undefined, userId, opts?.imageAttachments)
      : {}),
  }

  // Build system prompt
  const automationMode = hasComposioApps ? 'full' : storeId ? 'retail' : false
  const systemPrompt = buildAgentSystemPrompt(
    agentConfig,
    staticSkills,
    connectedApps,
    dynamicSkills,
    knowledgeSkills,
    automationMode
  )

  return {
    agent,
    agentConfig,
    systemPrompt,
    relayTools,
    connectedAppIds: [...agentAppIds],
    connectedAccountMap,
    composioEntityId,
    storeId,
  }
}
