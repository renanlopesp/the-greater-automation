import type Anthropic from '@anthropic-ai/sdk'
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from 'ai'
import type { HybridChatRequest } from './types'
import { getAnthropicClient } from '@/lib/anthropic'
import { buildCachedSystemBlock, buildCachedToolsBlock } from '@/lib/ai/prompt-cache'
import { buildOrchestratorSystemPrompt } from '@/lib/ai/platform-tools'
import { tokensToCredits } from '@/lib/billing/credits'
import { invokeTool } from './tools-client'
import { saveArtifact } from './save-artifact'
import { CHAT_TOOLS } from './tool-definitions'
import type { createServiceRoleClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = any

type MessageParam = Anthropic.Messages.MessageParam
type ContentBlock = Anthropic.Messages.ContentBlock
type ToolUseBlock = Anthropic.Messages.ToolUseBlock

type BrandDnaRow = {
  niche: string | null
  tone: string | null
  audience: string | null
  positioning: string | null
  words_to_use: string[] | null
  words_to_avoid: string[] | null
  store_name: string | null
}

const MODEL_FALLBACK = 'claude-sonnet-4-6'
const MAX_TOOL_ITERATIONS = 5

export interface MessagesEngineContext {
  user: { id: string; email: string }
  teamId: string
  body: HybridChatRequest
  serviceClient: ReturnType<typeof createServiceRoleClient>
  model?: string
}

/**
 * Fast Messages-API-direct chat engine with multi-turn tool loop.
 * Uses prompt-cached system block + cached tools + last 20 messages.
 */
export async function runMessagesEngine(ctx: MessagesEngineContext): Promise<Response> {
  const { user, teamId, body, serviceClient, model: modelOverride } = ctx
  const svc = serviceClient as ServiceClient

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
    userMessage = body.message ?? ''
  }

  if (!userMessage.trim()) {
    return Response.json({ error: 'Message is required' }, { status: 400 })
  }

  // ── Find or create conversation ───────────────────────────────────────
  let conversationId: string | null = null
  if (body.conversationId) {
    const { data: conv } = await svc
      .from('conversations')
      .select('id')
      .eq('id', body.conversationId)
      .eq('user_id', user.id)
      .single()
    if (conv?.id) conversationId = conv.id
  }

  if (!conversationId) {
    const { data: created } = await svc
      .from('conversations')
      .insert({
        team_id: teamId,
        user_id: user.id,
        title: userMessage.slice(0, 40),
        is_active: true,
      })
      .select('id')
      .single()
    conversationId = created?.id ?? null
  }

  if (!conversationId) {
    return Response.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  const convId = conversationId

  // ── Load last 20 messages BEFORE inserting the new one ────────────────
  const { data: history } = await svc
    .from('conversation_messages')
    .select('role, content, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(20)

  const historyRows = ((history ?? []) as Array<{ role: string; content: string }>).filter(
    (m) => m.role === 'user' || m.role === 'assistant'
  )

  // ── Persist user message (fire-and-forget) ────────────────────────────
  void svc
    .from('conversation_messages')
    .insert({
      conversation_id: convId,
      role: 'user',
      content: userMessage,
      metadata: { engine: 'messages-api' },
    })
    .then((r: { error?: unknown }) => {
      if (r?.error) console.error('[chat:messages] Failed to store user message:', r.error)
    })

  // ── Gather team context for system prompt ─────────────────────────────
  const [{ data: team }, { data: teamSkills }, { data: store }, { data: brandDna }] =
    await Promise.all([
      svc.from('teams').select('name, anthropic_model').eq('id', teamId).single(),
      svc
        .from('skills')
        .select('slug, name, description, category, status')
        .eq('team_id', teamId)
        .order('name'),
      svc
        .from('stores')
        .select('id, name, segment, platform')
        .eq('team_id', teamId)
        .limit(1)
        .single(),
      svc
        .from('brand_dna')
        .select('niche, tone, audience, positioning, words_to_use, words_to_avoid, store_name')
        .eq('team_id', teamId)
        .single(),
    ])

  let hasProducts = false
  if (store?.id) {
    const { count } = await svc
      .from('store_products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
    hasProducts = (count ?? 0) > 0
  }

  const systemPrompt = buildOrchestratorSystemPrompt(
    team?.name ?? 'Your workspace',
    (teamSkills as Array<{
      slug: string
      name: string
      description: string | null
      category: string
      status: string
    }> | null) ?? [],
    store
      ? {
          storeName: store.name,
          segment: store.segment,
          platform: store.platform,
          hasProducts,
        }
      : undefined,
    (brandDna as BrandDnaRow | null) ?? undefined,
    'full'
  )

  const system = [buildCachedSystemBlock(systemPrompt)]
  const cachedTools = buildCachedToolsBlock(CHAT_TOOLS)
  const model = modelOverride ?? team?.anthropic_model ?? MODEL_FALLBACK
  const storeId: string | undefined = store?.id ?? undefined
  const taskId: string | undefined = body.taskId

  // ── Build Anthropic messages from DB history + new user message ───────
  const messages: MessageParam[] = [
    ...historyRows.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: [{ type: 'text' as const, text: m.content }],
    })),
    { role: 'user' as const, content: [{ type: 'text' as const, text: userMessage }] },
  ]

  const anthropic = getAnthropicClient()

  const requestStart = Date.now()

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      let fullText = ''
      let tokensIn = 0
      let tokensOut = 0
      let textPartCounter = 0
      let toolCallCounter = 0
      let reasoningIdCounter = 0

      // Emit a single reasoning part upfront so the "Pensando..." shimmer
      // appears immediately while the first API round-trip completes.
      const reasoningId = `reasoning-${reasoningIdCounter++}`
      writer.write({ type: 'reasoning-start', id: reasoningId })
      writer.write({ type: 'reasoning-delta', id: reasoningId, delta: '' })
      writer.write({ type: 'reasoning-end', id: reasoningId })

      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        const partId = `text-${textPartCounter++}`
        let started = false

        const mStream = anthropic.messages.stream({
          model,
          system,
          tools: cachedTools,
          max_tokens: 4096,
          messages,
        })

        // Track tool_use blocks by index; inputJson accumulates per block.
        const toolInputJson = new Map<number, string>()

        // Token-by-token handler — highest granularity, no backpressure from
        // async iteration. BetaMessageStream types don't include 'inputJson' in
        // overloads, so we cast to any only for the .on() registration.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mStream as any).on('text', (delta: string) => {
          if (!started) {
            writer.write({ type: 'text-start', id: partId })
            started = true
          }
          writer.write({ type: 'text-delta', id: partId, delta })
          fullText += delta
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mStream as any).on(
          'inputJson',
          (partialJson: string, _snapshot: unknown, event: { index: number }) => {
            const prev = toolInputJson.get(event.index) ?? ''
            toolInputJson.set(event.index, prev + partialJson)
          }
        )

        // Wait for the model to finish the current turn.
        const finalMessage = await mStream.finalMessage()

        // Extract usage from the final message instead of message_start/message_delta events.
        tokensIn += finalMessage.usage?.input_tokens ?? 0
        tokensOut += finalMessage.usage?.output_tokens ?? 0

        if (started) writer.write({ type: 'text-end', id: partId })
        const stopReason = finalMessage.stop_reason
        const assistantBlocks = finalMessage.content as ContentBlock[]

        if (stopReason !== 'tool_use') {
          // Conversation is done for this turn.
          break
        }

        // Collect the tool_use blocks from the completed message.
        const toolUseBlocks = assistantBlocks.filter(
          (b): b is ToolUseBlock => b.type === 'tool_use'
        )
        if (toolUseBlocks.length === 0) break

        // Append the assistant message (text + tool_use blocks) to history.
        messages.push({ role: 'assistant', content: assistantBlocks })

        const toolResults: Array<Anthropic.Messages.ToolResultBlockParam> = []

        for (const toolUse of toolUseBlocks) {
          const toolCallId = `call-${toolCallCounter++}`
          const inputStr = JSON.stringify(toolUse.input ?? {})

          // Emit tool-input-start/delta/end events to the UI stream.
          writer.write({
            type: 'tool-input-start',
            toolCallId,
            toolName: toolUse.name,
          })
          writer.write({
            type: 'tool-input-delta',
            toolCallId,
            inputTextDelta: inputStr,
          })
          writer.write({
            type: 'tool-input-available',
            toolCallId,
            toolName: toolUse.name,
            input: toolUse.input,
          })

          // Invoke the tool.
          let resultText: string
          let isError = false
          try {
            const result = await invokeTool({
              name: toolUse.name,
              input: (toolUse.input as Record<string, unknown>) ?? {},
              context: {
                teamId,
                userId: user.id,
                storeId,
                taskId,
              },
            })

            if (result.artifact && taskId) {
              void saveArtifact(svc, taskId, result.artifact)
            }

            resultText = result.content.map((c) => c.text).join('\n') || '(no output)'
            isError = result.isError ?? false
          } catch (err) {
            isError = true
            resultText = err instanceof Error ? err.message : String(err)
            console.error('[chat:messages] invokeTool threw:', err)
          }

          writer.write({
            type: 'tool-output-available',
            toolCallId,
            output: resultText,
          })

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: resultText,
            is_error: isError,
          })
        }

        // Append the tool_result as a user message and loop.
        messages.push({ role: 'user', content: toolResults })

        if (iteration === MAX_TOOL_ITERATIONS - 1) {
          console.warn('[chat:messages] Hit MAX_TOOL_ITERATIONS cap — stopping tool loop', {
            iterations: iteration + 1,
          })
        }
      }

      writer.write({ type: 'finish', finishReason: 'stop' })
      console.log('[chat] done', {
        engine: 'messages-api',
        conversationId: convId,
        taskId,
        duration_ms: Date.now() - requestStart,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
      })

      if (fullText) {
        void svc
          .from('conversation_messages')
          .insert({
            conversation_id: convId,
            role: 'assistant',
            content: fullText,
            metadata: {
              engine: 'messages-api',
              model,
              tokens_in: tokensIn,
              tokens_out: tokensOut,
            },
          })
          .then((r: { error?: unknown }) => {
            if (r?.error) console.error('[chat:messages] Failed to persist assistant msg:', r.error)
          })
      }

      const credits = tokensToCredits(tokensIn + tokensOut)
      if (credits > 0) {
        void svc.rpc('increment_ai_credits', { p_team_id: teamId, p_credits: credits })
      }
    },
    onError: (error) => {
      console.error('[chat:messages] Stream error:', error)
      return error instanceof Error ? error.message : 'Stream error'
    },
  })

  const response = createUIMessageStreamResponse({ stream })
  const headers = new Headers(response.headers)
  headers.set('X-Conversation-Id', convId)
  headers.set('X-Chat-Engine', 'messages-api')
  return new Response(response.body, { status: response.status, headers })
}
