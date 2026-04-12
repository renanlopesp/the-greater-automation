const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

interface MessageParam {
  role: 'user' | 'assistant'
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'tool_use'; id: string; name: string; input: unknown }
        | { type: 'tool_result'; tool_use_id: string; content: string }
      >
}

interface CallMessagesOptions {
  model: string
  system: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>
  messages: MessageParam[]
  max_tokens?: number
  temperature?: number
  tools?: unknown[]
}

export async function callMessages(opts: CallMessagesOptions): Promise<{
  content: Array<{ type: string; text?: string; [k: string]: unknown }>
  stop_reason: string
  usage: { input_tokens: number; output_tokens: number }
}> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY must be set')
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      max_tokens: 4096,
      temperature: 0.7,
      ...opts,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 400)}`)
  }
  return (await res.json()) as never
}

/**
 * Generate a JSON object matching the provided JSON-schema.
 * Uses Anthropic's tool-use pattern: defines a single tool whose
 * input_schema is the target object schema, and expects the model
 * to call it exactly once with the structured output.
 */
export async function generateObject<T>(opts: {
  model: string
  system: string
  prompt: string
  schema: Record<string, unknown> // JSON schema (object)
  schemaName?: string
  maxTokens?: number
}): Promise<T> {
  const toolName = opts.schemaName ?? 'emit_result'
  const result = await callMessages({
    model: opts.model,
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
    max_tokens: opts.maxTokens ?? 8192,
    tools: [
      {
        name: toolName,
        description: 'Emit the structured result matching the schema.',
        input_schema: opts.schema,
      },
    ],
  })
  const toolUse = result.content.find(
    (b) => b.type === 'tool_use' && (b as { name: string }).name === toolName
  ) as { type: 'tool_use'; input: T } | undefined
  if (!toolUse) throw new Error('Model did not emit the structured result tool call')
  return toolUse.input
}
