import 'server-only'
import { z } from 'zod'
import { getAnthropicClient } from '@/lib/anthropic'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { provisionAgent } from '@/lib/ai/agent-provisioning'
import { createLogger } from '@/lib/logger'

const log = createLogger('ai/agent-client')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AskAgentOptions {
  /** Timeout in ms (default: 120_000) */
  timeout?: number
  /** If true, auto-provision agent if team has none (default: true) */
  autoProvision?: boolean
  /** User ID for provisioning context (required if autoProvision and team has no agent) */
  userId?: string
}

export interface AgentResponse {
  text: string
  usage: { inputTokens: number; outputTokens: number }
  sessionId: string
}

// ---------------------------------------------------------------------------
// askAgent — send a prompt to the team's Managed Agent, return full response
// ---------------------------------------------------------------------------

export async function askAgent(
  teamId: string,
  prompt: string,
  options?: AskAgentOptions
): Promise<AgentResponse> {
  const timeout = options?.timeout ?? 120_000
  const autoProvision = options?.autoProvision ?? true

  const serviceClient = createServiceRoleClient()

  // ── Look up team's Agent + Environment ──────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: team } = await (serviceClient as any)
    .from('teams')
    .select('anthropic_agent_id, anthropic_env_id')
    .eq('id', teamId)
    .single()

  let agentId: string | null = team?.anthropic_agent_id ?? null
  let envId: string | null = team?.anthropic_env_id ?? null

  // ── Auto-provision if needed ────────────────────────────────────────
  if (!agentId || !envId) {
    if (!autoProvision) {
      throw new Error(`Agent not provisioned for team ${teamId}`)
    }
    const userId = options?.userId ?? teamId
    const result = await provisionAgent(teamId, userId)
    agentId = result.agentId
    envId = result.envId
  }

  // ── Create session ──────────────────────────────────────────────────
  const anthropic = getAnthropicClient()

  const session = await anthropic.beta.sessions.create({
    agent: agentId!,
    environment_id: envId!,
    metadata: { team_id: teamId, source: 'agent-client' },
  })

  // ── Send message ────────────────────────────────────────────────────
  await anthropic.beta.sessions.events.send(session.id, {
    events: [
      {
        type: 'user.message',
        content: [{ type: 'text', text: prompt }],
      },
    ],
  })

  // ── Collect response via streaming ──────────────────────────────────
  let fullText = ''
  let inputTokens = 0
  let outputTokens = 0

  const eventStream = await anthropic.beta.sessions.events.stream(session.id)

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Agent response timeout after ${timeout}ms`)), timeout)
  )

  await Promise.race([
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const event of eventStream as AsyncIterable<any>) {
        if (event.type === 'agent.message') {
          const textBlocks = (event.content ?? []).filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (b: any) => b.type === 'text'
          )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fullText += textBlocks.map((b: any) => b.text).join('')
        } else if (event.type === 'span.model_request_end') {
          inputTokens += event.usage?.input_tokens ?? 0
          outputTokens += event.usage?.output_tokens ?? 0
        } else if (event.type === 'session.status_idle') {
          if (event.stop_reason?.type === 'end_turn') break
        } else if (event.type === 'session.status_terminated' || event.type === 'session.error') {
          const msg = event.error?.message ?? 'Agent session error'
          throw new Error(msg)
        }
      }
    })(),
    timeoutPromise,
  ])

  log.info({ teamId, sessionId: session.id, inputTokens, outputTokens }, 'Agent response complete')

  return {
    text: fullText,
    usage: { inputTokens, outputTokens },
    sessionId: session.id,
  }
}

// ---------------------------------------------------------------------------
// askAgentJSON — ask Agent for structured JSON output, validate with Zod
// ---------------------------------------------------------------------------

/**
 * Sends a prompt to the Managed Agent with instructions to respond in JSON,
 * then parses and validates the response against a Zod schema.
 *
 * Retries once on parse failure with a more explicit prompt.
 */
export async function askAgentJSON<T>(
  teamId: string,
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: AskAgentOptions & { retries?: number }
): Promise<T> {
  const maxRetries = options?.retries ?? 1

  const jsonInstruction = [
    prompt,
    '',
    'IMPORTANT: Respond ONLY with valid JSON. No explanation, no markdown code blocks, no extra text.',
    'Just the raw JSON object.',
  ].join('\n')

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const enrichedPrompt =
      attempt === 0
        ? jsonInstruction
        : [
            jsonInstruction,
            '',
            'Your previous response was not valid JSON. Please respond with ONLY a valid JSON object, nothing else.',
          ].join('\n')

    const response = await askAgent(teamId, enrichedPrompt, options)
    const parsed = extractJSON(response.text)

    if (parsed !== null) {
      const result = schema.safeParse(parsed)
      if (result.success) {
        return result.data
      }
      log.warn({ teamId, attempt, errors: result.error.issues }, 'Agent JSON validation failed')
    } else {
      log.warn({ teamId, attempt, responseLength: response.text.length }, 'Agent JSON parse failed')
    }

    if (attempt >= maxRetries) {
      throw new Error(
        `Agent structured output failed after ${maxRetries + 1} attempts. ` +
          `Response was: ${response.text.slice(0, 200)}...`
      )
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error('Unreachable')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract JSON from Agent response, stripping markdown fences if present. */
function extractJSON(text: string): unknown | null {
  // Try raw parse first
  try {
    return JSON.parse(text.trim())
  } catch {
    // noop
  }

  // Try stripping markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {
      // noop
    }
  }

  // Try finding first { ... } or [ ... ] block
  const braceStart = text.indexOf('{')
  const bracketStart = text.indexOf('[')
  const start =
    braceStart >= 0 && (bracketStart < 0 || braceStart < bracketStart) ? braceStart : bracketStart

  if (start >= 0) {
    const isArray = text[start] === '['
    const closer = isArray ? ']' : '}'
    let depth = 0
    for (let i = start; i < text.length; i++) {
      if (text[i] === (isArray ? '[' : '{')) depth++
      if (text[i] === closer) depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1))
        } catch {
          break
        }
      }
    }
  }

  return null
}
