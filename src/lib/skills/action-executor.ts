import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SkillActionConfig,
  ActionExecutionResult,
  ComposioActionConfig,
  AiTransformActionConfig,
  NotifyActionConfig,
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
      const fieldPath = path.slice(8) // Remove 'trigger.'
      const value = getNestedValue(triggerData, fieldPath)
      return value !== undefined ? String(value) : match
    } else if (path.startsWith('prev.')) {
      const fieldPath = path.slice(5) // Remove 'prev.'
      const value = getNestedValue(previousOutputs, fieldPath)
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
      limit: 200,
    })
    const toolMeta = tools.find((t) => t.slug === config.action)
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
 * Execute all actions sequentially, passing outputs between steps.
 */
export async function executeActions(
  actions: SkillActionConfig[],
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
