export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { type UIMessage, createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/anthropic'
import { safeError } from '@/lib/safe-error'
import { tokensToCredits } from '@/lib/billing/credits'
import { checkUsageLimits } from '@/lib/billing/usage-check'

/**
 * POST /api/chat — Orchestrator chat via Anthropic Managed Agents API.
 *
 * Flow:
 * 1. Auth + team lookup
 * 2. Parse user message
 * 3. Auto-provision Managed Agent if team lacks one
 * 4. Find or create conversation + Anthropic session
 * 5. Send user message event
 * 6. Stream session events → translate to UIMessageChunk SSE for useChat
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const serviceClient = createServiceRoleClient()

  // ── 1. Auth ───────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [body, { data: membership }] = await Promise.all([
    request.json(),
    supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1).single(),
  ])

  if (!membership) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  const teamId = membership.team_id

  // ── 1b. Pre-chat credit check ─────────────────────────────────────────
  const usage = await checkUsageLimits(teamId)
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: usage.reason ?? 'Credit limit reached',
        code: 'INSUFFICIENT_CREDITS',
        aiCreditsUsed: usage.aiCreditsUsed,
        aiCreditsLimit: usage.aiCreditsLimit,
      },
      { status: 402 }
    )
  }

  // ── 2. Parse user message ─────────────────────────────────────────────
  let userMessage: string
  const existingConvId = body.conversationId as string | undefined
  const taskId = body.taskId as string | undefined

  if (body.messages && Array.isArray(body.messages)) {
    const msgs = body.messages as UIMessage[]
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    if (!lastUser) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }
    const textPart = lastUser.parts?.find((p) => p.type === 'text')
    userMessage = textPart ? (textPart as { type: 'text'; text: string }).text : ''
  } else {
    userMessage = body.message as string
  }

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // ── 3. Load team + check Managed Agent provisioning ───────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: team } = await (serviceClient as any)
    .from('teams')
    .select('name, anthropic_agent_id, anthropic_env_id')
    .eq('id', teamId)
    .single()

  let agentId: string = team?.anthropic_agent_id ?? ''
  let envId: string = team?.anthropic_env_id ?? ''

  const anthropic = getAnthropicClient()

  // Auto-provision if needed
  if (!agentId || !envId) {
    try {
      const ids = await provisionAgent(anthropic, serviceClient, teamId, team?.name, taskId)
      agentId = ids.agentId
      envId = ids.envId
    } catch (error) {
      return NextResponse.json(
        { error: safeError('auto-provision', error, 'Failed to provision agent') },
        { status: 500 }
      )
    }
  }

  // ── 4. Find or create conversation + Anthropic session ────────────────
  let conversationId = existingConvId ?? null
  let sessionId: string | null = null

  if (conversationId) {
    // Load existing session ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conv } = await (serviceClient as any)
      .from('conversations')
      .select('id, anthropic_session_id')
      .eq('id', conversationId)
      .single()
    sessionId = conv?.anthropic_session_id ?? null
  }

  if (!conversationId) {
    // Find active conversation or create new one
    const { data: activeConv } = await serviceClient
      .from('conversations' as never)
      .select('id, anthropic_session_id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (activeConv) {
      conversationId = (activeConv as { id: string; anthropic_session_id?: string }).id
      sessionId =
        (activeConv as { id: string; anthropic_session_id?: string }).anthropic_session_id ?? null
    } else {
      // Create new conversation
      const { data: conv } = await (
        serviceClient as unknown as {
          from: (t: string) => {
            insert: (d: unknown) => {
              select: (s: string) => { single: () => Promise<{ data: { id: string } | null }> }
            }
          }
        }
      )
        .from('conversations')
        .insert({
          team_id: teamId,
          user_id: user.id,
          title: userMessage.slice(0, 100),
          is_active: true,
        })
        .select('id')
        .single()
      conversationId = conv?.id ?? null
    }
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  // Link conversation to task (so messages persist across page reloads)
  if (taskId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (serviceClient as any)
      .from('tasks')
      .update({ conversation_id: conversationId })
      .eq('id', taskId)
      .then((r: { error?: unknown }) => {
        if (r?.error) console.error('[chat] Failed to link task to conversation:', r.error)
      })
  }

  // Create Anthropic session if we don't have one
  if (!sessionId) {
    try {
      const session = await anthropic.beta.sessions.create({
        agent: agentId,
        environment_id: envId,
        metadata: {
          team_id: teamId,
          conversation_id: conversationId,
        },
      })
      sessionId = session.id

      // Persist session ID to conversation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (serviceClient as any)
        .from('conversations')
        .update({ anthropic_session_id: sessionId })
        .eq('id', conversationId)
    } catch (error) {
      return NextResponse.json(
        { error: safeError('create-session', error, 'Failed to create session') },
        { status: 500 }
      )
    }
  }

  // ── 5. Store user message (fire-and-forget) ───────────────────────────
  void (
    serviceClient as unknown as {
      from: (t: string) => { insert: (d: unknown) => Promise<{ error?: unknown }> }
    }
  )
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
    })
    .then((result: { error?: unknown }) => {
      if (result?.error) console.error('[chat] Failed to store user message:', result.error)
    })

  // ── 6. Inject skill/task context into message if applicable ───────────
  let enrichedMessage = userMessage
  if (taskId) {
    const skillContext = await buildSkillContext(serviceClient, taskId, teamId)
    if (skillContext) {
      enrichedMessage = `${userMessage}\n\n${skillContext}`
    }
  }

  // ── 7. Send message + stream response ─────────────────────────────────
  const convId = conversationId
  const sId = sessionId

  try {
    // Send user message event
    await anthropic.beta.sessions.events.send(sId, {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text: enrichedMessage }],
        },
      ],
    })

    // Stream session events and translate to UIMessageStream
    // The agent handles tool calls via MCP server — we just proxy the stream
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Pure streaming proxy — agent handles tools via MCP server
        let fullText = ''
        let totalTokens = 0
        let currentTextId = 0

        const eventStream = await anthropic.beta.sessions.events.stream(sId)

        for await (const event of eventStream) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = event as any
          if (e.type === 'agent.message') {
            const textBlocks = e.content?.filter((b: { type: string }) => b.type === 'text')
            if (textBlocks) {
              for (const block of textBlocks) {
                const partId = `text-${currentTextId++}`
                writer.write({ type: 'text-start', id: partId })
                writer.write({ type: 'text-delta', delta: block.text, id: partId })
                writer.write({ type: 'text-end', id: partId })
                fullText += block.text
              }
            }
          } else if (e.type === 'agent.thinking') {
            const rid = `reasoning-${currentTextId++}`
            writer.write({ type: 'reasoning-start', id: rid })
            writer.write({ type: 'reasoning-delta', id: rid, delta: '(thinking...)' })
            writer.write({ type: 'reasoning-end', id: rid })
          } else if (e.type === 'span.model_request_end' && e.model_usage) {
            const u = e.model_usage
            totalTokens +=
              (u.input_tokens ?? 0) +
              (u.output_tokens ?? 0) +
              (u.cache_read_input_tokens ?? 0) +
              (u.cache_creation_input_tokens ?? 0)
          } else if (e.type === 'session.status_idle') {
            // Session went idle — could be end_turn or waiting for MCP tool result
            // MCP tools are handled by the agent, so we just check if it's end_turn
            if (e.stop_reason?.type === 'end_turn') break
          } else if (e.type === 'session.status_terminated' || e.type === 'session.error') {
            break
          }
          // Detect skill execution via MCP and run in background on Next.js
          if (e.type === 'agent.mcp_tool_use' && e.name === 'SNEW_RUN_SKILL' && taskId) {
            const args = typeof e.input === 'string' ? JSON.parse(e.input) : e.input
            console.log('[chat] SNEW_RUN_SKILL detected:', args?.skill_slug, 'taskId:', taskId)
            if (args?.skill_slug === 'seasonal-calendar') {
              void generateCalendarInBackground(serviceClient, taskId, teamId)
            }
          }
        }

        // Finalize
        writer.write({ type: 'finish', finishReason: 'stop' })

        if (fullText) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (serviceClient as any)
            .from('conversation_messages')
            .insert({ conversation_id: convId, role: 'assistant', content: fullText })
            .then((r: { error?: unknown }) => {
              if (r?.error) console.error('[chat] Failed to persist:', r.error)
            })
        }

        const credits = tokensToCredits(totalTokens)
        if (credits > 0) {
          void serviceClient.rpc('increment_ai_credits', { p_team_id: teamId, p_credits: credits })
        }
      },
      onError: (error) => {
        console.error('[chat] Stream error:', error)
        return error instanceof Error ? error.message : 'Stream error'
      },
    })

    const response = createUIMessageStreamResponse({ stream })
    const headers = new Headers(response.headers)
    headers.set('X-Conversation-Id', convId)

    return new Response(response.body, { status: response.status, headers })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('managed-agent-chat', error, 'Chat failed') },
      { status: 500 }
    )
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Auto-provision a Managed Agent + Environment for a team.
 * Delegates to the dedicated provision route handler.
 */
async function provisionAgent(
  anthropic: ReturnType<typeof getAnthropicClient>,
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  teamId: string,
  teamName?: string,
  taskId?: string
): Promise<{ agentId: string; envId: string }> {
  // Use the same logic as the provision route: import directly
  const { buildOrchestratorSystemPrompt } = await import('@/lib/ai/platform-tools')
  const { getTeamPlan } = await import('@/lib/billing/feature-gate')

  const sc = serviceClient as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (
          k: string,
          v: string
        ) => {
          single: () => Promise<{ data: Record<string, unknown> | null }>
          limit: (n: number) => { single: () => Promise<{ data: Record<string, unknown> | null }> }
        }
      }
    }
  }
  const [{ data: brandDna }, { data: storeData }] = await Promise.all([
    sc.from('brand_dna').select('niche').eq('team_id', teamId).single(),
    sc.from('stores').select('id').eq('team_id', teamId).limit(1).single(),
  ])

  const hasBrandDna = brandDna && brandDna.niche
  const mode = hasBrandDna ? 'full' : 'onboarding'
  const storeId = storeData?.id ?? null

  const systemPrompt = buildOrchestratorSystemPrompt(
    teamName ?? 'Your workspace',
    [],
    undefined,
    null,
    mode
  )

  const plan = await getTeamPlan(teamId)
  const model =
    plan.planId === 'pro' || plan.planId === 'enterprise' ? 'claude-opus-4-6' : 'claude-sonnet-4-6'

  const mcpBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  const mcpSecret = process.env.MCP_AUTH_TOKEN ?? ''
  const mcpUrl = `${mcpBaseUrl}/mcp-tools?team_id=${teamId}&user_id=${teamId}${storeId ? `&store_id=${storeId}` : ''}${taskId ? `&task_id=${taskId}` : ''}&secret=${mcpSecret}`

  const [agent, env] = await Promise.all([
    anthropic.beta.agents.create({
      name: 'Snew',
      model,
      system: systemPrompt,
      mcp_servers: [{ type: 'url', name: 'snew-tools', url: mcpUrl }],
      tools: [
        {
          type: 'mcp_toolset',
          mcp_server_name: 'snew-tools',
          default_config: { enabled: true, permission_policy: { type: 'always_allow' } },
        },
      ],
      description: `Snew assistant for team ${teamName ?? teamId}`,
    }),
    anthropic.beta.environments.create({
      name: `snew-env-${teamId}`,
      description: `Environment for team ${teamName ?? teamId}`,
    }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (serviceClient as any)
    .from('teams')
    .update({
      anthropic_agent_id: agent.id,
      anthropic_env_id: env.id,
    })
    .eq('id', teamId)

  return { agentId: agent.id, envId: env.id }
}

/**
 * Build skill context string for task-scoped messages.
 * Lightweight version — injects artifact context and skill hints.
 */
async function buildSkillContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  taskId: string,
  teamId: string
): Promise<string | null> {
  const { data: taskMeta } = await serviceClient
    .from('tasks')
    .select('selected_skill, artifact_type, artifact_data')
    .eq('id', taskId)
    .single()

  if (!taskMeta) return null

  const { getSkillConfig } = await import('@/lib/skills/skill-registry')
  const config = getSkillConfig(taskMeta.selected_skill)
  let context = ''

  if (config.promptAdditions) {
    context += config.promptAdditions
  }

  // Inject calendar artifact context
  if (taskMeta.artifact_type === 'seasonal-calendar' && taskMeta.artifact_data) {
    const cal = taskMeta.artifact_data as {
      dates?: Array<{ id: string; name: string; displayDate?: string }>
      year?: number
      campaigns?: Record<string, unknown>
    }
    const campaigns = cal.campaigns ?? {}
    const dateList = (cal.dates ?? [])
      .map((d) => {
        const hasCampaign = !!campaigns[d.id]
        return `- ${d.id} → "${d.name}" (${d.displayDate ?? ''}) [${hasCampaign ? 'GERADA' : 'PENDENTE'}]`
      })
      .join('\n')
    const campaignCount = Object.keys(campaigns).length

    context += `\n\n[ARTIFACT — Calendário Sazonal ${cal.year} no painel lateral]
Datas (${(cal.dates ?? []).length} total, ${campaignCount} com campanha gerada):
${dateList}

REGRAS: Para PERGUNTAS sobre o calendário, responda usando o contexto acima. Para MODIFICAÇÕES, informe o usuário que essa funcionalidade está sendo migrada.`
  } else if (taskMeta.artifact_type) {
    context += `\n\n[ARTIFACT — Tipo: ${taskMeta.artifact_type}. Dados disponíveis no painel lateral.]`
  }

  // Check if seasonal-calendar skill should auto-generate
  const isCalendarBySkill =
    taskMeta.selected_skill === 'seasonal-calendar' && !taskMeta.artifact_type
  if (isCalendarBySkill) {
    // Mark task as running
    await serviceClient
      .from('tasks')
      .update({
        skill_status: 'running',
        active_skill: 'seasonal-calendar',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    // Generate calendar in background
    void generateCalendarInBackground(serviceClient, taskId, teamId)

    context +=
      '\n\n[SKILL RUNNING — O Calendário Sazonal está sendo gerado em segundo plano e aparecerá no painel de entrega. Informe o usuário brevemente (2-3 frases).]'
  }

  return context || null
}

/**
 * Background calendar generation (fire-and-forget).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateCalendarInBackground(serviceClient: any, taskId: string, teamId: string) {
  // Helper to update progress steps visible in the artifact loading state
  const updateProgress = async (steps: Array<{ label: string; done: boolean }>) => {
    await serviceClient
      .from('tasks')
      .update({ artifact_data: { steps }, updated_at: new Date().toISOString() })
      .eq('id', taskId)
  }

  try {
    await updateProgress([{ label: 'Analisando Brand DNA da loja...', done: false }])

    const [{ data: bd }, { data: store }] = await Promise.all([
      serviceClient
        .from('brand_dna')
        .select('niche, audience, positioning, tone, average_ticket, opportunities')
        .eq('team_id', teamId)
        .single(),
      serviceClient
        .from('stores')
        .select('id, platform, platform_store_id, platform_access_token')
        .eq('team_id', teamId)
        .limit(1)
        .single(),
    ])

    const brandLabel = bd?.niche
      ? `Brand DNA: ${bd.niche} · ${bd.tone ?? 'sem tom definido'}`
      : 'Brand DNA não encontrado — usando padrões'

    await updateProgress([
      { label: brandLabel, done: true },
      { label: 'Verificando conexão com a loja...', done: false },
    ])

    let calendarProducts: Array<{ name: string; price: number }> = []
    let productSource = ''
    if (store?.platform === 'nuvemshop' && store.platform_store_id && store.platform_access_token) {
      try {
        const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
        const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
        const liveProducts = await client.getProducts(1, 200)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        calendarProducts = liveProducts.map((p: any) => ({
          name:
            typeof p.name === 'object'
              ? ((p.name as Record<string, string>).pt ??
                Object.values(p.name as Record<string, string>)[0] ??
                '')
              : String(p.name),
          price: p.variants?.[0]?.price ? Number(p.variants[0].price) : 0,
        }))
        productSource = `${calendarProducts.length} produtos via Nuvemshop`
      } catch {
        console.warn('[generateCalendarInBackground] Nuvemshop API failed, using DB products')
        const { data: prods } = await serviceClient
          .from('store_products')
          .select('name, price')
          .eq('store_id', store.id)
          .limit(200)
        calendarProducts = (prods ?? []) as Array<{ name: string; price: number }>
        productSource =
          calendarProducts.length > 0
            ? `${calendarProducts.length} produtos do catálogo local (Nuvemshop desconectada)`
            : 'Nenhum produto encontrado — calendário genérico'
      }
    } else if (store) {
      const { data: prods } = await serviceClient
        .from('store_products')
        .select('name, price')
        .eq('store_id', store.id)
        .limit(50)
      calendarProducts = (prods ?? []) as Array<{ name: string; price: number }>
      productSource =
        calendarProducts.length > 0
          ? `${calendarProducts.length} produtos do catálogo`
          : 'Nenhum produto encontrado'
    } else {
      productSource = 'Loja não conectada — calendário genérico'
    }

    const opCount = (bd?.opportunities as unknown[])?.length ?? 0

    await updateProgress([
      { label: brandLabel, done: true },
      { label: productSource, done: true },
      ...(opCount > 0
        ? [{ label: `${opCount} oportunidades sazonais identificadas`, done: true }]
        : []),
      { label: 'Gerando calendário personalizado com IA...', done: false },
    ])

    const { generateCalendar } = await import('@/lib/ai/seasonal-campaign-generator')
    const calendarData = await generateCalendar(
      teamId,
      {
        brandDna: {
          niche: bd?.niche ?? 'varejo',
          audience: bd?.audience ?? 'consumidores gerais',
          positioning: bd?.positioning ?? '',
          tone: bd?.tone ?? 'profissional',
          average_ticket: bd?.average_ticket ?? 100,
          opportunities: bd?.opportunities ?? [],
        },
        products: calendarProducts,
        currentDate: new Date(),
        year: new Date().getFullYear(),
      },
      'direct'
    )

    await serviceClient
      .from('tasks')
      .update({
        artifact_data: calendarData,
        artifact_type: 'seasonal-calendar',
        skill_status: 'completed',
        active_skill: 'seasonal-calendar',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
  } catch (err) {
    console.error('[generateCalendarInBackground] FAILED:', err)
    await serviceClient
      .from('tasks')
      .update({ skill_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', taskId)
  }
}
