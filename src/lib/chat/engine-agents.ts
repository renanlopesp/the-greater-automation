import { type UIMessage, createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { getAnthropicClient } from '@/lib/anthropic'
import { safeError } from '@/lib/safe-error'
import { tokensToCredits } from '@/lib/billing/credits'
import { saveArtifact } from './save-artifact'
import { askAgent } from '@/lib/ai/agent-client'
import { createServiceRoleClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = any

export interface AgentsEngineContext {
  user: { id: string }
  teamId: string
  body: {
    messages?: UIMessage[]
    message?: string
    conversationId?: string
    taskId?: string
  }
  serviceClient: ServiceClient
}

/**
 * Managed Agents streaming engine.
 * Handles: agent provisioning, conversation/session management,
 * message persistence, skill context injection, SSE streaming, credit increment.
 * Returns the Next.js Response object built via createUIMessageStreamResponse.
 */
export async function runAgentsEngine(ctx: AgentsEngineContext): Promise<Response> {
  const { user, teamId, body, serviceClient } = ctx

  const existingConvId = body.conversationId as string | undefined
  const taskId = body.taskId as string | undefined

  // ── Parse user message ────────────────────────────────────────────────
  let userMessage: string
  if (body.messages && Array.isArray(body.messages)) {
    const msgs = body.messages as UIMessage[]
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    if (!lastUser) {
      return Response.json({ error: 'No user message found' }, { status: 400 })
    }
    const textPart = lastUser.parts?.find((p) => p.type === 'text')
    userMessage = textPart ? (textPart as { type: 'text'; text: string }).text : ''
  } else {
    userMessage = body.message as string
  }

  if (!userMessage?.trim()) {
    return Response.json({ error: 'Message is required' }, { status: 400 })
  }

  // ── Load team + check Managed Agent provisioning ──────────────────────
  const { data: team } = await (serviceClient as ServiceClient)
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
      const { provisionAgent: sharedProvision } = await import('@/lib/ai/agent-provisioning')
      const ids = await sharedProvision(teamId, user.id)
      agentId = ids.agentId
      envId = ids.envId
    } catch (error) {
      return Response.json(
        { error: safeError('auto-provision', error, 'Failed to provision agent') },
        { status: 500 }
      )
    }
  }

  // ── Find or create conversation + Anthropic session ───────────────────
  let conversationId = existingConvId ?? null
  let sessionId: string | null = null

  if (conversationId) {
    const { data: conv } = await (serviceClient as ServiceClient)
      .from('conversations')
      .select('id, anthropic_session_id')
      .eq('id', conversationId)
      .single()
    sessionId = conv?.anthropic_session_id ?? null
  }

  if (!conversationId) {
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
    return Response.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  // Link conversation to task (so messages persist across page reloads)
  if (taskId) {
    void (serviceClient as ServiceClient)
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

      await (serviceClient as ServiceClient)
        .from('conversations')
        .update({ anthropic_session_id: sessionId })
        .eq('id', conversationId)
    } catch (error) {
      return Response.json(
        { error: safeError('create-session', error, 'Failed to create session') },
        { status: 500 }
      )
    }
  }

  // ── Store user message (fire-and-forget) ──────────────────────────────
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

  // ── Inject skill/task context into message if applicable ──────────────
  let enrichedMessage = userMessage
  if (taskId) {
    const skillContext = await buildSkillContext(serviceClient, taskId, teamId)
    if (skillContext) {
      enrichedMessage = `${userMessage}\n\n${skillContext}`
    }
  }

  // ── Send message + stream response ────────────────────────────────────
  const convId = conversationId
  const sId = sessionId

  const requestStart = Date.now()

  try {
    await anthropic.beta.sessions.events.send(sId, {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text: enrichedMessage }],
        },
      ],
    })

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        let fullText = ''
        let totalTokens = 0
        let currentTextId = 0

        let reasoningEmitted = false
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
            if (!reasoningEmitted) {
              const rid = `reasoning-${currentTextId++}`
              writer.write({ type: 'reasoning-start', id: rid })
              writer.write({ type: 'reasoning-delta', id: rid, delta: '' })
              writer.write({ type: 'reasoning-end', id: rid })
              reasoningEmitted = true
            }
          } else if (e.type === 'span.model_request_end' && e.model_usage) {
            const u = e.model_usage
            totalTokens +=
              (u.input_tokens ?? 0) +
              (u.output_tokens ?? 0) +
              (u.cache_read_input_tokens ?? 0) +
              (u.cache_creation_input_tokens ?? 0)
          } else if (e.type === 'session.status_idle') {
            if (e.stop_reason?.type === 'end_turn') break
          } else if (e.type === 'session.status_terminated' || e.type === 'session.error') {
            break
          }
          // Extract artifact from MCP tool result (if present).
          if (e.type === 'agent.mcp_tool_result' && taskId && !e.is_error) {
            const firstText = e.content?.find((b: { type: string }) => b.type === 'text')
            if (firstText?.text) {
              try {
                const parsed = JSON.parse(firstText.text) as { __artifact?: unknown }
                if (parsed.__artifact) {
                  void saveArtifact(serviceClient, taskId, parsed.__artifact)
                }
              } catch {
                // tool returned non-JSON text, ignore
              }
            }
          }
        }

        writer.write({ type: 'finish', finishReason: 'stop' })
        console.log('[chat] done', {
          engine: 'managed-agents',
          conversationId: convId,
          taskId,
          duration_ms: Date.now() - requestStart,
          tokens_in: totalTokens,
        })

        if (fullText) {
          await (serviceClient as ServiceClient)
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
    return Response.json(
      { error: safeError('managed-agent-chat', error, 'Chat failed') },
      { status: 500 }
    )
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Build skill context string for task-scoped messages.
 */
async function buildSkillContext(
  serviceClient: ServiceClient,
  taskId: string,
  teamId: string
): Promise<string | null> {
  const { data: taskMeta } = await serviceClient
    .from('tasks')
    .select('selected_skill, artifact_type, artifact_data, skill_status')
    .eq('id', taskId)
    .single()

  if (!taskMeta) return null

  const { getSkillConfig } = await import('@/lib/skills/skill-registry')
  const config = getSkillConfig(taskMeta.selected_skill)
  let context = ''

  if (config.promptAdditions) {
    context += config.promptAdditions
  }

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

  return context || null
}

// ── Background skill runner (T022) ──────────────────────────────────────

export interface AgentsEngineBackgroundContext {
  user: { id: string; email: string }
  teamId: string
  taskId: string
  conversationId: string
  userMessage: string
  skillSlug: string
}

const FOLLOWUPS_MARKER_RE = /<!--\s*snew:followups\s+[\s\S]*?-->/g
const ARTIFACT_BLOB_RE = /__artifact["']?\s*:\s*(\{[\s\S]*?\})\s*[,}]/

/**
 * Skills that have a dedicated Supabase Edge Function generator.
 * When the slug matches, the Edge Function is dispatched directly and owns
 * the task status transition (running → completed/failed).
 * The Next.js background only fires askAgent to produce a human-readable reply.
 */
const EDGE_FUNCTION_SKILLS: Record<string, string> = {
  'seasonal-calendar': 'generate-seasonal-calendar',
}

/**
 * Run the Managed Agent for a skill AFTER the HTTP response has been sent.
 * Uses a fresh service-role Supabase client (request client may be torn down).
 *
 * For skills in EDGE_FUNCTION_SKILLS:
 *   - The Edge Function is dispatched directly (fire-and-forget) and owns
 *     the skill_status transition.
 *   - askAgent still runs to give the user a text reply in chat.
 *   - This function does NOT mark the task completed — the Edge Function does.
 *
 * For all other skills:
 *   - askAgent runs and this function marks the task completed/failed.
 */
export async function runAgentsEngineBackground(ctx: AgentsEngineBackgroundContext): Promise<void> {
  const { user, teamId, taskId, conversationId, userMessage, skillSlug } = ctx
  const client = createServiceRoleClient() as ServiceClient

  try {
    await client
      .from('tasks')
      .update({
        skill_status: 'running',
        active_skill: skillSlug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    // If this skill has a dedicated Edge Function, dispatch it directly.
    // The Edge Function writes artifact_data and marks task completed/failed on its own.
    const edgeEndpoint = EDGE_FUNCTION_SKILLS[skillSlug]
    if (edgeEndpoint) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const secret = process.env.MCP_AUTH_TOKEN ?? ''
      const dispatchUrl = `${supabaseUrl}/functions/v1/${edgeEndpoint}?secret=${secret}`
      void fetch(dispatchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, task_id: taskId, user_id: user.id }),
      })
        .then(async (r) => {
          if (!r.ok) {
            const body = await r.text().catch(() => '')
            console.error('[chat] Edge Function dispatch failed', {
              skillSlug,
              status: r.status,
              body: body.slice(0, 200),
            })
          }
        })
        .catch((err) => console.error('[chat] Edge Function dispatch threw', err))
    }

    const result = await askAgent(teamId, userMessage, {
      userId: user.id,
      timeout: 120_000,
    })

    // Strip followup markers; try to extract any inline __artifact blob.
    let text = result.text.replace(FOLLOWUPS_MARKER_RE, '').trim()
    const artifactMatch = text.match(ARTIFACT_BLOB_RE)
    if (artifactMatch?.[1]) {
      try {
        const artifact = JSON.parse(artifactMatch[1])
        void saveArtifact(client, taskId, artifact)
      } catch {
        // ignore parse errors
      }
      text = text.replace(ARTIFACT_BLOB_RE, '').trim()
    }

    await client.from('conversation_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: text,
      metadata: {
        engine: 'managed-agents',
        skill: skillSlug,
        tokens_in: result.usage.inputTokens,
        tokens_out: result.usage.outputTokens,
      },
    })

    // Only mark completed here if there is no Edge Function handling the transition.
    // Edge Function skills own their own skill_status transition.
    if (!edgeEndpoint) {
      await client
        .from('tasks')
        .update({
          skill_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
    }

    const totalTokens = result.usage.inputTokens + result.usage.outputTokens
    const credits = tokensToCredits(totalTokens)
    if (credits > 0) {
      void client.rpc('increment_ai_credits', { p_team_id: teamId, p_credits: credits })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[chat] background skill run failed', { taskId, skillSlug, error })

    await client
      .from('tasks')
      .update({ skill_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', taskId)

    await client.from('conversation_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: `Falha ao gerar ${skillSlug}: ${message}`,
      metadata: { engine: 'managed-agents', skill: skillSlug, error: true },
    })
  }
}
