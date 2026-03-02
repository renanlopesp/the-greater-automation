import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  WorkflowActionConfig,
  ActionExecutionResult,
  ComposioActionConfig,
  AiTransformActionConfig,
  NotifyActionConfig,
  ClaudeAgentActionConfig,
} from './types'
import { getComposio } from '@/lib/composio/client'

/**
 * Get a nested value from an object using dot-path notation.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Resolve template strings like {{trigger.field}} and {{prev.key}}.
 */
function resolveTemplate(
  template: string,
  triggerData: Record<string, unknown>,
  previousOutputs: Record<string, unknown>
): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (match, path: string) => {
    if (path.startsWith('trigger.')) {
      const value = getNestedValue(triggerData, path.slice(8))
      return value !== undefined ? String(value) : match
    }
    if (path.startsWith('prev.')) {
      const value = getNestedValue(previousOutputs, path.slice(5))
      return value !== undefined ? String(value) : match
    }
    return match
  })
}

/**
 * Resolve all values in a params object. Handles strings, arrays of strings, and numbers.
 */
function resolveParams(
  params: Record<string, unknown>,
  triggerData: Record<string, unknown>,
  previousOutputs: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      const resolvedValue = resolveTemplate(value, triggerData, previousOutputs)
      // Auto-convert numeric strings for integer params
      const asNum = Number(resolvedValue)
      resolved[key] = !isNaN(asNum) && resolvedValue.trim() !== '' ? asNum : resolvedValue
    } else if (Array.isArray(value)) {
      resolved[key] = value.map((item) =>
        typeof item === 'string' ? resolveTemplate(item, triggerData, previousOutputs) : item
      )
    } else {
      resolved[key] = value
    }
  }
  return resolved
}

/**
 * Execute a composio_action using composio.tools.execute() directly.
 * Looks up the user's connectedAccountId from app_connections.
 */
async function executeComposioAction(
  config: ComposioActionConfig,
  triggerData: Record<string, unknown>,
  previousOutputs: Record<string, unknown>,
  userId: string,
  supabaseClient: SupabaseClient
): Promise<ActionExecutionResult> {
  const startTime = Date.now()

  try {
    // Look up the user's Composio connection for this app
    const { data: connection } = await supabaseClient
      .from('app_connections')
      .select('composio_connection_id')
      .eq('user_id', userId)
      .eq('app_id', config.app_id)
      .single()

    if (!connection?.composio_connection_id) {
      return {
        action_type: 'composio_action',
        action_config: config,
        status: 'failed',
        error: `No ${config.app_id} connection found for user`,
        duration_ms: Date.now() - startTime,
      }
    }

    // Resolve parameters
    const resolvedParams = resolveParams(config.params, triggerData, previousOutputs)

    // Look up the tool version (required for manual execution)
    const composio = getComposio()
    const tools = await composio.tools.getRawComposioTools({
      toolkits: [config.app_id],
      limit: 500,
    })
    const toolsBySlug = new Map(tools.map((t) => [t.slug, t]))
    const toolMeta = toolsBySlug.get(config.action)
    const version = toolMeta?.version

    // Execute via composio.tools.execute() — requires version + userId for manual execution
    const result = await composio.tools.execute(config.action, {
      connectedAccountId: connection.composio_connection_id,
      userId,
      arguments: resolvedParams,
      ...(version ? { version } : {}),
    })

    const appResult = result as {
      successful?: boolean
      data?: unknown
      error?: string
      message?: string
    }

    if (!appResult.successful) {
      return {
        action_type: 'composio_action',
        action_config: config,
        status: 'failed',
        error: appResult.error || appResult.message || `Action ${config.action} failed`,
        output: { resolved_params: resolvedParams, raw_result: result },
        duration_ms: Date.now() - startTime,
      }
    }

    return {
      action_type: 'composio_action',
      action_config: config,
      status: 'success',
      output: appResult.data as Record<string, unknown>,
      duration_ms: Date.now() - startTime,
    }
  } catch (error) {
    // Extract full error details from Composio
    const err = error as Record<string, unknown>
    const message = err?.message ?? 'Unknown error'
    const resp = err?.response as Record<string, unknown> | undefined
    const detail = resp?.data ?? resp?.body ?? err?.cause ?? err?.errCode ?? null
    const resolvedParams = resolveParams(config.params, triggerData, previousOutputs)
    console.error(`[action-executor] Composio error for ${config.action}:`, message, detail)
    return {
      action_type: 'composio_action',
      action_config: config,
      status: 'failed',
      error: `${message}${detail ? ` — ${JSON.stringify(detail)}` : ''}`,
      output: { resolved_params: resolvedParams },
      duration_ms: Date.now() - startTime,
    }
  }
}

/**
 * Execute an ai_transform using OpenAI.
 */
async function executeAiTransform(
  config: AiTransformActionConfig,
  triggerData: Record<string, unknown>,
  previousOutputs: Record<string, unknown>
): Promise<ActionExecutionResult> {
  const startTime = Date.now()

  try {
    const openai = createOpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
    })

    const model = config.model && config.model !== 'default' ? config.model : 'gpt-4o-mini'
    const resolvedPrompt = resolveTemplate(config.prompt, triggerData, previousOutputs)

    const { text } = await generateText({
      model: openai(model),
      prompt: resolvedPrompt,
    })

    // Clean AI output: trim whitespace, remove surrounding quotes
    const cleaned = text.trim().replace(/^['"`]+|['"`]+$/g, '')

    return {
      action_type: 'ai_transform',
      action_config: config,
      status: 'success',
      output: { [config.output_key]: cleaned },
      duration_ms: Date.now() - startTime,
    }
  } catch (error) {
    return {
      action_type: 'ai_transform',
      action_config: config,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    }
  }
}

/**
 * Execute a notify action (for now, returns the message; can be extended to send via Composio).
 */
async function executeNotify(
  config: NotifyActionConfig,
  triggerData: Record<string, unknown>,
  previousOutputs: Record<string, unknown>
): Promise<ActionExecutionResult> {
  const startTime = Date.now()

  try {
    const resolvedMessage = resolveTemplate(config.message, triggerData, previousOutputs)

    return {
      action_type: 'notify',
      action_config: config,
      status: 'success',
      output: {
        channel: config.channel,
        message: resolvedMessage,
        target: config.target,
      },
      duration_ms: Date.now() - startTime,
    }
  } catch (error) {
    return {
      action_type: 'notify',
      action_config: config,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    }
  }
}

/**
 * Execute a claude_agent action — AI analysis with tool access and structured output.
 */
async function executeClaudeAgentStep(
  config: ClaudeAgentActionConfig,
  triggerData: Record<string, unknown>,
  previousOutputs: Record<string, unknown>,
  userId: string,
  ...[]: [SupabaseClient]
): Promise<ActionExecutionResult> {
  const startTime = Date.now()

  try {
    const openai = createOpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
    })

    const model = config.model && config.model !== 'default' ? config.model : 'gpt-4o'
    const resolvedPrompt = resolveTemplate(config.prompt, triggerData, previousOutputs)
    const timeoutMs = config.timeout_ms ?? 300_000

    // Build Composio tools if specified
    let tools: Record<string, unknown> | undefined
    if (config.tools && config.tools.length > 0) {
      try {
        const { getComposioSession } = await import('@/lib/composio/composio-session')
        // Derive toolkit names from tool slugs (e.g. GITHUB_GET_PR → 'github')
        const toolkitIds = [
          ...new Set(config.tools.map((t: string) => t.split('_')[0].toLowerCase())),
        ]
        const session = await getComposioSession(userId, toolkitIds)
        const allTools = await session.tools()

        // Filter to only the requested tools
        const filteredTools: Record<string, unknown> = {}
        for (const toolName of config.tools) {
          if (allTools[toolName]) {
            filteredTools[toolName] = allTools[toolName]
          }
        }
        if (Object.keys(filteredTools).length > 0) {
          tools = filteredTools
        }
      } catch (toolError) {
        console.warn('[action-executor] Failed to load Composio tools for claude_agent:', toolError)
        // Continue without tools
      }
    }

    // Build system prompt with context
    const systemPrompt = `You are an AI agent executing a workflow step. Analyze the provided data and produce a clear, structured response.

${config.output_format === 'json' ? 'IMPORTANT: Your final response MUST be valid JSON. Do not include markdown code fences or any text outside the JSON object.' : ''}`

    const { text } = await generateText({
      model: openai(model),
      system: systemPrompt,
      prompt: resolvedPrompt,
      ...(tools
        ? { tools: tools as Parameters<typeof generateText>[0]['tools'], maxSteps: 5 }
        : {}),
      abortSignal: AbortSignal.timeout(timeoutMs),
    })

    // Parse output based on format
    let output: unknown = text.trim()
    if (config.output_format === 'json') {
      try {
        // Try to extract JSON from the response (handle markdown code fences)
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
        output = JSON.parse((jsonMatch[1] || text).trim())
      } catch {
        output = { raw_text: text.trim() }
      }
    }

    return {
      action_type: 'claude_agent',
      action_config: config,
      status: 'success',
      output: { [config.output_key]: output },
      duration_ms: Date.now() - startTime,
    }
  } catch (error) {
    return {
      action_type: 'claude_agent',
      action_config: config,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    }
  }
}

/**
 * Execute all actions sequentially, passing outputs between steps.
 */
export async function executeActions(
  actions: WorkflowActionConfig[],
  triggerData: Record<string, unknown>,
  userId: string,
  supabaseClient: SupabaseClient
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = []
  const previousOutputs: Record<string, unknown> = {}

  for (const action of actions) {
    let result: ActionExecutionResult

    switch (action.type) {
      case 'composio_action':
        result = await executeComposioAction(
          action,
          triggerData,
          previousOutputs,
          userId,
          supabaseClient
        )
        break

      case 'ai_transform':
        result = await executeAiTransform(action, triggerData, previousOutputs)
        break

      case 'notify':
        result = await executeNotify(action, triggerData, previousOutputs)
        break

      case 'claude_agent':
        result = await executeClaudeAgentStep(
          action,
          triggerData,
          previousOutputs,
          userId,
          supabaseClient
        )
        break

      default:
        result = {
          action_type: 'notify',
          action_config: action,
          status: 'failed',
          error: 'Unknown action type',
        }
    }

    results.push(result)

    // Merge successful outputs into previousOutputs for next action
    if (result.status === 'success' && result.output) {
      Object.assign(previousOutputs, result.output)
    }

    // Stop execution if action failed
    if (result.status === 'failed') {
      break
    }
  }

  return results
}
