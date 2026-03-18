export const maxDuration = 120

import { NextRequest, NextResponse, after } from 'next/server'
import { type UIMessage, convertToModelMessages } from 'ai'
import { createServerClient } from '@/lib/supabase/server'
import {
  buildAgentSystemPrompt,
  runAgentChat,
  type AgentConfig,
  type AgentSkill,
  type ConnectedApp,
} from '@/lib/ai/agent-chat'
import { tokensToCredits } from '@/lib/billing/credits'
import { buildSkillBuilderTools } from '@/lib/ai/skill-builder-tools'
import { buildRetailTools } from '@/lib/ai/retail-tools'
import { buildPlatformTools, buildOrchestratorSystemPrompt } from '@/lib/ai/platform-tools'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = await params
  const supabase = await createServerClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse request body — supports both useChat format and legacy format
  const body = await request.json()
  let userMessage: string
  const existingConvId = body.conversationId as string | undefined

  if (body.messages && Array.isArray(body.messages)) {
    // Vercel AI SDK useChat format: { messages: UIMessage[], conversationId? }
    const msgs = body.messages as UIMessage[]
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    if (!lastUser) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }
    // Extract text content from UIMessage parts
    const textPart = lastUser.parts?.find((p) => p.type === 'text')
    userMessage = textPart ? (textPart as { type: 'text'; text: string }).text : ''
  } else {
    // Legacy format: { message: string, conversationId? }
    userMessage = body.message as string
  }

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  if (existingConvId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(existingConvId)) {
      return NextResponse.json({ error: 'Invalid conversationId format' }, { status: 400 })
    }
  }

  // 3. Load agent + skills + knowledge + connections in parallel (all independent)
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
    supabase.rpc('get_agent_available_connections', { p_agent_id: agentId, p_user_id: user.id }),
  ])

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // ── Orchestrator branch ──────────────────────────────────────────────
  // When the agent is an orchestrator, use platform tools + SNEW_ASK_AGENT
  // instead of agent-scoped tools, and use the orchestrator system prompt.
  if (agent.is_orchestrator) {
    // Load team's specialist agents for the orchestrator prompt catalog
    const [{ data: teamAgents }, { data: store }] = await Promise.all([
      supabase
        .from('agents')
        .select('id, name, description')
        .eq('team_id', agent.team_id)
        .eq('is_orchestrator', false)
        .order('name'),
      supabase
        .from('stores')
        .select('id, name, segment, platform, platform_access_token')
        .eq('team_id', agent.team_id)
        .limit(1)
        .single(),
    ])

    const storeId = store?.id ?? null

    // hasProducts and team name are independent — fetch in parallel
    const [hasProductsResult, { data: team }] = await Promise.all([
      store
        ? supabase
            .from('store_products')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', store.id)
        : Promise.resolve({ count: 0 }),
      supabase.from('teams').select('name').eq('id', agent.team_id).single(),
    ])
    const hasProducts = store ? (hasProductsResult.count ?? 0) > 0 : false

    // Build orchestrator system prompt with agent catalog
    const orchestratorPrompt = buildOrchestratorSystemPrompt(
      team?.name ?? 'Your workspace',
      teamAgents ?? [],
      store
        ? {
            storeName: store.name,
            segment: store.segment,
            platform: store.platform,
            hasProducts,
          }
        : undefined
    )

    // Platform tools (includes SNEW_ASK_AGENT, retail tools, etc.)
    const platformTools = buildPlatformTools(
      user.id,
      agent.team_id,
      undefined,
      storeId ?? undefined
    )

    // Load or create conversation (same logic as regular agents)
    let orchConvId = existingConvId
    if (!orchConvId) {
      const { data: activeConv } = await supabase
        .from('agent_conversations')
        .select('id')
        .eq('agent_id', agentId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (activeConv) {
        orchConvId = activeConv.id
      } else {
        const { data: conv } = await supabase
          .from('agent_conversations')
          .insert({
            agent_id: agentId,
            user_id: user.id,
            created_by: user.id,
            is_active: true,
            title: userMessage.slice(0, 100),
          })
          .select('id')
          .single()
        orchConvId = conv?.id
      }
    }

    if (!orchConvId) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    // Insert user message
    await supabase.from('agent_messages').insert({
      conversation_id: orchConvId,
      role: 'user',
      content: userMessage,
      sender_id: user.id,
    })

    // Build messages
    let orchMessages: Awaited<ReturnType<typeof convertToModelMessages>>
    if (body.messages && Array.isArray(body.messages)) {
      orchMessages = await convertToModelMessages(body.messages as UIMessage[])
    } else {
      const { data: historyRows } = await supabase
        .from('agent_messages')
        .select('role, content')
        .eq('conversation_id', orchConvId)
        .order('created_at', { ascending: true })
        .limit(50)

      orchMessages = (historyRows ?? [])
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    }

    const orchAgentConfig: AgentConfig = {
      id: agent.id,
      name: agent.name,
      system_prompt: null, // prompt is handled by buildOrchestratorSystemPrompt
      model: 'gpt-5.2',
      temperature: null, // reasoning models don't support temperature
      max_tokens: agent.max_tokens,
    }

    // Load ALL connected apps from ALL team members so orchestrator can use any tool directly
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', agent.team_id)
    const teamUserIds = (teamMembers ?? []).map((m) => m.user_id)

    const { data: allConnections } =
      teamUserIds.length > 0
        ? await supabase
            .from('app_connections')
            .select('app_id, composio_connection_id, user_id')
            .in('user_id', teamUserIds)
        : { data: null }

    const orchAppIds = new Set<string>()
    let orchConnectedAccountMap: Record<string, string> | undefined
    let orchEntityId = user.id

    if (allConnections && allConnections.length > 0) {
      orchConnectedAccountMap = {}
      const ownerCounts = new Map<string, number>()
      for (const row of allConnections) {
        orchAppIds.add(row.app_id)
        if (row.composio_connection_id) {
          if (!orchConnectedAccountMap[row.app_id] || row.user_id === user.id) {
            orchConnectedAccountMap[row.app_id] = row.composio_connection_id
          }
          ownerCounts.set(row.user_id, (ownerCounts.get(row.user_id) ?? 0) + 1)
        }
      }
      if (!ownerCounts.has(user.id) && ownerCounts.size > 0) {
        let maxCount = 0
        for (const [ownerId, count] of ownerCounts) {
          if (count > maxCount) {
            maxCount = count
            orchEntityId = ownerId
          }
        }
      }
    }

    // Also include the store platform if it uses Composio
    if (store?.platform && store.platform !== 'manual' && store.platform !== 'nuvemshop') {
      orchAppIds.add(store.platform)
    }

    // Update status + run chat
    await supabase.from('agents').update({ status: 'running' }).eq('id', agentId)

    try {
      const result = await runAgentChat({
        userId: orchEntityId,
        agent: orchAgentConfig,
        messages: orchMessages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
        systemPrompt: orchestratorPrompt,
        relayTools: platformTools,
        connectedAppIds: orchAppIds.size > 0 ? [...orchAppIds] : undefined,
        connectedAccountMap: orchConnectedAccountMap,
        onFinish: async ({ text, usage }) => {
          if (text) {
            await supabase.from('agent_messages').insert({
              conversation_id: orchConvId,
              role: 'assistant',
              content: text,
            })
          }
          const credits = tokensToCredits(usage?.totalTokens ?? 0)
          if (credits > 0 && agent.team_id) {
            await supabase.rpc('increment_ai_credits', {
              p_team_id: agent.team_id,
              p_credits: credits,
            })
          }
        },
      })

      after(async () => {
        await supabase.from('agents').update({ status: 'idle' }).eq('id', agentId)
      })

      const response = result.toUIMessageStreamResponse({ sendReasoning: true })
      const headers = new Headers(response.headers)
      headers.set('X-Conversation-Id', orchConvId)
      return new Response(response.body, { status: response.status, headers })
    } catch (error) {
      await supabase.from('agents').update({ status: 'idle' }).eq('id', agentId)
      const errorMessage = error instanceof Error ? error.message : 'Chat failed'
      console.error('[agent-chat] Orchestrator error:', errorMessage)
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  }
  // ── End orchestrator branch ──────────────────────────────────────────

  const agentConfig: AgentConfig = {
    id: agent.id,
    name: agent.name,
    system_prompt: agent.system_prompt,
    model: agent.model,
    temperature: agent.temperature,
    max_tokens: agent.max_tokens,
  }

  // 4. Transform query results
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

  const rpcRows = (rpcConnections ?? []) as Array<{ app_id: string; is_own_connection: boolean }>
  const ownConnections = rpcRows.filter((r) => r.is_own_connection)
  const connectedApps: ConnectedApp[] = (ownConnections.length > 0 ? ownConnections : rpcRows).map(
    (conn) => ({
      appId: conn.app_id,
      actions: [],
    })
  )

  // 5. Load or create conversation
  let conversationId = existingConvId
  if (!conversationId) {
    const { data: activeConv } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('agent_id', agentId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (activeConv) {
      conversationId = activeConv.id
    } else {
      const { data: conv } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          user_id: user.id,
          created_by: user.id,
          is_active: true,
          title: userMessage.slice(0, 100),
        })
        .select('id')
        .single()
      conversationId = conv?.id
    }
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  // 6. Insert user message to DB for persistence
  await supabase.from('agent_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: userMessage,
    sender_id: user.id,
  })

  // 7. Build messages for the AI model
  let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>

  if (body.messages && Array.isArray(body.messages)) {
    modelMessages = await convertToModelMessages(body.messages as UIMessage[])
  } else {
    const { data: historyRows } = await supabase
      .from('agent_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50)

    modelMessages = (historyRows ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
  }

  // 8. Determine which Composio apps this agent explicitly uses in workflows
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
  // Also include apps the user has connected — so the agent can use them
  // directly in chat, not only through workflow steps.
  for (const app of connectedApps) {
    agentAppIds.add(app.appId)
  }

  // Extract image attachments from the latest user message for retail tools
  let imageAttachments: Array<{ url: string; mediaType: string }> | undefined
  if (body.messages && Array.isArray(body.messages)) {
    const msgs = body.messages as UIMessage[]
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    if (lastUser?.parts) {
      const fileParts = lastUser.parts.filter(
        (p): p is { type: 'file'; url: string; mediaType: string } =>
          p.type === 'file' &&
          'mediaType' in p &&
          (p as { mediaType: string }).mediaType.startsWith('image/')
      )
      if (fileParts.length > 0) {
        imageAttachments = fileParts.map((f) => ({ url: f.url, mediaType: f.mediaType }))
      }
    }
  }

  // 8b. Fetch store and team members in parallel (both independent of each other)
  let storeId: string | null = null
  const [storeResult, membersResult] = await Promise.all([
    agent.team_id
      ? supabase
          .from('stores')
          .select('id, platform, platform_store_id')
          .eq('team_id', agent.team_id)
          .limit(1)
          .single()
      : Promise.resolve({ data: null }),
    agent.team_id
      ? supabase.from('team_members').select('user_id').eq('team_id', agent.team_id)
      : Promise.resolve({ data: null }),
  ])

  const store = storeResult.data
  if (store) {
    storeId = store.id
    if (store.platform && store.platform !== 'manual' && store.platform_store_id) {
      // Only add to Composio apps if the platform uses Composio (not nuvemshop, which uses native API)
      if (store.platform !== 'nuvemshop') {
        agentAppIds.add(store.platform)
      }
    }
  }

  const hasComposioApps = agentAppIds.size > 0

  // 8c. Build connected account map for Composio session (custom auth configs need explicit IDs)
  // Query ALL team members' connections — not just the current user's — so agents
  // can use connections made by any team member (e.g. JP connected GA, Renan chats).
  // Also determine the Composio entity ID: Composio validates that connected accounts
  // belong to the entity, so we must use the connection owner's user ID.
  let connectedAccountMap: Record<string, string> | undefined
  let composioEntityId = user.id
  if (hasComposioApps) {
    const userIds = [user.id]
    const members = membersResult.data
    if (members) {
      for (const m of members) {
        if (m.user_id !== user.id) userIds.push(m.user_id)
      }
    }

    const { data: connRows } = await supabase
      .from('app_connections')
      .select('app_id, composio_connection_id, user_id')
      .in('user_id', userIds)
      .in('app_id', [...agentAppIds])
    if (connRows && connRows.length > 0) {
      connectedAccountMap = {}
      // Track connection owners to determine the Composio entity ID
      const ownerCounts = new Map<string, number>()
      for (const row of connRows) {
        if (row.composio_connection_id) {
          // Prefer current user's connection over team member's
          if (!connectedAccountMap[row.app_id] || row.user_id === user.id) {
            connectedAccountMap[row.app_id] = row.composio_connection_id
          }
          ownerCounts.set(row.user_id, (ownerCounts.get(row.user_id) ?? 0) + 1)
        }
      }
      // Use the connection owner with the most connections as the Composio entity.
      // Prefer the current user if they have any connections.
      if (!ownerCounts.has(user.id) && ownerCounts.size > 0) {
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

  // 9. Build Relay virtual tools for skill management
  // Retail agents need workflow tools (web scraping, notify) even without Composio apps.
  // Only exclude heavy Composio-specific tools when there are no Composio apps AND no store.
  const needsWorkflowTools = hasComposioApps || !!storeId
  const relayTools: Record<string, unknown> = {
    ...buildSkillBuilderTools(
      agentId,
      user.id,
      agent.team_id,
      needsWorkflowTools ? 'full' : 'chat'
    ),
    // Add retail tools (stock queries, price monitoring, etc.) when the team has a store
    ...(storeId && agent.team_id
      ? buildRetailTools(storeId, agent.team_id, undefined, user.id, imageAttachments)
      : {}),
  }

  // 10. Build system prompt
  // Retail agents (with store, no Composio) get focused automation instructions (web scraping, notify, cron).
  // Composio agents get full automation instructions (app events, composio_action, auth awareness).
  // Agents with neither get no automation instructions.
  const automationMode = hasComposioApps ? 'full' : storeId ? 'retail' : false
  let systemPrompt = buildAgentSystemPrompt(
    agentConfig,
    staticSkills,
    connectedApps,
    dynamicSkills,
    knowledgeSkills,
    automationMode
  )

  // 10b. For module-based agents, inject module context + recent activity summary
  if ((agent as Record<string, unknown>).agent_type) {
    const agentType = (agent as Record<string, unknown>).agent_type as string
    const { data: moduleRows } = await supabase
      .from('agent_modules' as never)
      .select('name, description, module_type, enabled')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true })

    if (moduleRows && (moduleRows as unknown[]).length > 0) {
      type ModRow = {
        name: string
        description: string | null
        module_type: string
        enabled: boolean
      }
      const mods = moduleRows as ModRow[]

      // Fetch last 24h activity summary
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const { data: activityRows } = await supabase
        .from('workflow_run_outputs' as never)
        .select('output_type, output_data, summary_text')
        .eq('agent_modules.agent_id' as never, agentId)
        .gte('created_at', yesterday.toISOString())
        .eq('output_type', 'kpi-summary')
        .limit(5)

      type ActivityRow = {
        output_data: { kpis?: { label: string; value: string }[]; summary?: string }
      }
      const actRows = (activityRows ?? []) as ActivityRow[]
      const latestKpis = actRows[0]?.output_data?.kpis ?? []
      const latestSummary = actRows[0]?.output_data?.summary ?? ''

      const moduleLines = mods
        .map(
          (m) =>
            `- **${m.name}** (${m.module_type}): ${m.description ?? ''} [${m.enabled ? 'ativo' : 'pausado'}]`
        )
        .join('\n')

      const kpiLines =
        latestKpis.length > 0
          ? latestKpis.map((k) => `  - ${k.label}: ${k.value}`).join('\n')
          : '  Sem dados recentes.'

      const moduleContext = [
        '',
        `## Módulos Ativos (agent_type: ${agentType})`,
        '',
        'Você é um agente especializado com os seguintes módulos pré-configurados:',
        moduleLines,
        '',
        '## Atividade Recente (últimas 24h)',
        '',
        latestSummary ? `Resumo: ${latestSummary}` : 'Sem resumo disponível.',
        '',
        'KPIs:',
        kpiLines,
        '',
        '## Ferramentas de Módulo Disponíveis',
        '',
        '- **AGENT_QUERY_MODULE_DATA** — consulta dados de performance dos módulos (KPIs, atividade recente, resultados)',
        '- **AGENT_TRIGGER_MODULE** — aciona um módulo para executar imediatamente',
        '',
        'Use estas ferramentas quando o usuário perguntar sobre performance, resultados, ou quiser acionar uma análise.',
      ].join('\n')

      systemPrompt = systemPrompt + moduleContext
    }

    // Add module tools to relayTools
    const { buildPlatformTools: buildModuleTools } = await import('@/lib/ai/platform-tools')
    const moduleTools = buildModuleTools(agentId, agent.team_id ?? '', supabase)
    Object.assign(relayTools, {
      AGENT_QUERY_MODULE_DATA: moduleTools.AGENT_QUERY_MODULE_DATA,
      AGENT_TRIGGER_MODULE: moduleTools.AGENT_TRIGGER_MODULE,
    })
  }

  // 11. Update agent status to 'running'
  await supabase.from('agents').update({ status: 'running' }).eq('id', agentId)

  // 12. Run agent chat with Vercel AI SDK + Composio tools
  try {
    const result = await runAgentChat({
      userId: composioEntityId,
      agent: agentConfig,
      messages: modelMessages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
      systemPrompt,
      relayTools,
      connectedAppIds: hasComposioApps ? [...agentAppIds] : undefined,
      connectedAccountMap,
      onFinish: async ({ text, usage }) => {
        if (text) {
          await supabase.from('agent_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: text,
          })
        }
        const credits = tokensToCredits(usage?.totalTokens ?? 0)
        if (credits > 0 && agent.team_id) {
          await supabase.rpc('increment_ai_credits', {
            p_team_id: agent.team_id,
            p_credits: credits,
          })
        }
      },
    })

    // Reset agent status after response is sent
    after(async () => {
      await supabase.from('agents').update({ status: 'idle' }).eq('id', agentId)
    })

    // Return streaming response with conversation ID header
    const response = result.toUIMessageStreamResponse({ sendReasoning: true })
    const headers = new Headers(response.headers)
    headers.set('X-Conversation-Id', conversationId)

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error) {
    await supabase.from('agents').update({ status: 'idle' }).eq('id', agentId)
    const errorMessage = error instanceof Error ? error.message : 'Chat failed'
    console.error('[agent-chat] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
