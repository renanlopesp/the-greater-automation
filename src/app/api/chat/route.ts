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
      const ids = await provisionAgent(anthropic, serviceClient, teamId, team?.name)
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
        // Build tool executors
        const { buildPlatformTools } = await import('@/lib/ai/platform-tools')
        const { buildRetailTools } = await import('@/lib/ai/retail-tools')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storeIdVal = await (serviceClient as any)
          .from('stores')
          .select('id')
          .eq('team_id', teamId)
          .limit(1)
          .single()
          .then((r: { data: { id: string } | null }) => r.data?.id ?? null)
        const platformTools = buildPlatformTools(user.id, teamId, serviceClient, storeIdVal, taskId)
        const retailTools = storeIdVal
          ? buildRetailTools(storeIdVal, teamId, serviceClient, user.id)
          : null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allTools: Record<string, { execute: (params: any) => Promise<unknown> }> = {
          ...platformTools,
          ...(retailTools ?? {}),
        }

        let fullText = ''
        let totalTokens = 0
        let currentTextId = 0

        // Helper: emit text blocks from events to the UI stream
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emitEvents = (events: any[]) => {
          for (const evt of events) {
            if (evt.type === 'agent.message') {
              const textBlocks = evt.content?.filter((b: { type: string }) => b.type === 'text')
              if (textBlocks) {
                for (const block of textBlocks) {
                  const partId = `text-${currentTextId++}`
                  writer.write({ type: 'text-start', id: partId })
                  writer.write({ type: 'text-delta', delta: block.text, id: partId })
                  writer.write({ type: 'text-end', id: partId })
                  fullText += block.text
                }
              }
            } else if (evt.type === 'agent.thinking') {
              const rid = `reasoning-${currentTextId++}`
              writer.write({ type: 'reasoning-start', id: rid })
              writer.write({ type: 'reasoning-delta', id: rid, delta: '(thinking...)' })
              writer.write({ type: 'reasoning-end', id: rid })
            } else if (evt.type === 'span.model_request_end' && evt.model_usage) {
              const u = evt.model_usage
              totalTokens +=
                (u.input_tokens ?? 0) +
                (u.output_tokens ?? 0) +
                (u.cache_read_input_tokens ?? 0) +
                (u.cache_creation_input_tokens ?? 0)
            }
          }
        }

        // Round 1: stream events in real-time
        const eventStream = await anthropic.beta.sessions.events.stream(sId)
        let toolUseId: string | null = null
        let toolName = ''
        let toolInput: Record<string, unknown> = {}

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
          } else if (e.type === 'agent.custom_tool_use') {
            toolUseId = e.id
            toolName = e.name
            toolInput = e.input ?? {}
          } else if (e.type === 'span.model_request_end' && e.model_usage) {
            const u = e.model_usage
            totalTokens +=
              (u.input_tokens ?? 0) +
              (u.output_tokens ?? 0) +
              (u.cache_read_input_tokens ?? 0) +
              (u.cache_creation_input_tokens ?? 0)
          }
          // Stream ends when session goes idle
        }

        // After stream: handle tool call if one was requested
        if (toolUseId) {
          console.error(`[chat] Tool call: ${toolName}`, JSON.stringify(toolInput).slice(0, 200))
          let toolResult: unknown
          let isError = false
          try {
            const tool = allTools[toolName]
            if (!tool) {
              toolResult = { error: `Unknown tool: ${toolName}` }
              isError = true
            } else {
              toolResult = await tool.execute(toolInput)
              if (toolResult && typeof toolResult === 'object' && 'error' in toolResult)
                isError = true
            }
          } catch (err) {
            toolResult = { error: err instanceof Error ? err.message : String(err) }
            isError = true
          }

          // Send tool result
          await anthropic.beta.sessions.events.send(sId, {
            events: [
              {
                type: 'user.custom_tool_result',
                custom_tool_use_id: toolUseId,
                content: [{ type: 'text', text: JSON.stringify(toolResult) }],
                is_error: isError,
              },
            ],
          })

          // Wait for agent to start processing the tool result
          for (let i = 0; i < 10; i++) {
            await new Promise((r) => setTimeout(r, 500))
            const session = await anthropic.beta.sessions.retrieve(sId)
            if (session.status === 'running') break
          }

          // Stream round 2: agent's response after tool result
          const stream2 = await anthropic.beta.sessions.events.stream(sId)
          for await (const event of stream2) {
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
            } else if (e.type === 'span.model_request_end' && e.model_usage) {
              const u = e.model_usage
              totalTokens +=
                (u.input_tokens ?? 0) +
                (u.output_tokens ?? 0) +
                (u.cache_read_input_tokens ?? 0) +
                (u.cache_creation_input_tokens ?? 0)
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
  teamName?: string
): Promise<{ agentId: string; envId: string }> {
  // Use the same logic as the provision route: import directly
  const { buildOrchestratorSystemPrompt } = await import('@/lib/ai/platform-tools')
  const { getTeamPlan } = await import('@/lib/billing/feature-gate')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: brandDna } = await (serviceClient as any)
    .from('brand_dna')
    .select('niche')
    .eq('team_id', teamId)
    .single()

  const hasBrandDna = brandDna && brandDna.niche
  const mode = hasBrandDna ? 'full' : 'onboarding'

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

  const { buildCustomToolDefinitions } = await import('@/lib/mcp/custom-tool-definitions')
  const customTools = buildCustomToolDefinitions({ hasStore: true })

  const [agent, env] = await Promise.all([
    anthropic.beta.agents.create({
      name: 'Snew',
      model,
      system: systemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: customTools as any,
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
  try {
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

    let calendarProducts: Array<{ name: string; price: number }> = []
    if (store?.platform === 'nuvemshop' && store.platform_store_id && store.platform_access_token) {
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
    } else if (store) {
      const { data: prods } = await serviceClient
        .from('store_products')
        .select('name, price')
        .eq('store_id', store.id)
        .limit(50)
      calendarProducts = (prods ?? []) as Array<{ name: string; price: number }>
    }

    const { generateCalendar } = await import('@/lib/ai/seasonal-campaign-generator')
    const calendarData = await generateCalendar({
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
    })

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
  } catch {
    await serviceClient
      .from('tasks')
      .update({ skill_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', taskId)
  }
}
