import type { WebhookTriggerConfig } from './trigger-defaults'
import { decryptSecret } from '@/lib/crypto'
import { executeAIStep } from '@/lib/ai/chat'
import { executeHTTPStep } from '@/lib/ai/http-executor'
import { executeFlowControlStep } from '@/lib/workflow-editor/flow-control-executor'
import { executeWebScrapingStep } from '@/lib/workflow-editor/web-scraping-executor'
import { executeUtilityStep } from '@/lib/workflow-editor/utility-executor'
import { executeSequenceStep } from '@/lib/workflow-editor/sequence-executor'
import type {
  AIStepConfig,
  HTTPStepConfig,
  FlowControlStepConfig,
  WebScrapingStepConfig,
  UtilityStepConfig,
  SequenceStepConfig,
} from '@/lib/workflow-editor/step-defaults'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Webhook Token
// ---------------------------------------------------------------------------

export function generateWebhookToken(): string {
  return crypto.randomUUID()
}

export function buildWebhookUrl(token: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  return `${baseUrl}/api/workflows/webhook/${token}`
}

// ---------------------------------------------------------------------------
// Webhook Validation
// ---------------------------------------------------------------------------

export function validateWebhookSecret(
  config: WebhookTriggerConfig,
  request: Request
): { valid: boolean } {
  // Decrypt the secret if stored encrypted
  let secret = config.secret
  if (!secret && config.encrypted_secret) {
    secret = decryptSecret(config.encrypted_secret)
  }
  if (!secret) {
    return { valid: true }
  }
  const headerSecret = request.headers.get('x-webhook-secret')
  return { valid: headerSecret === secret }
}

export function validateWebhookMethod(
  config: WebhookTriggerConfig,
  request: Request
): { valid: boolean; actual: string } {
  const actual = request.method.toUpperCase()
  return { valid: actual === config.method, actual }
}

// ---------------------------------------------------------------------------
// Webhook Payload Capture
// ---------------------------------------------------------------------------

export interface WebhookTriggerData {
  source: 'webhook'
  method: string
  headers: Record<string, string>
  body: unknown
  query: Record<string, string>
  triggered_at: string
  [key: string]: unknown
}

const EXCLUDED_HEADERS = new Set(['authorization', 'cookie', 'x-webhook-secret'])

export async function captureWebhookPayload(request: Request): Promise<WebhookTriggerData> {
  const url = new URL(request.url)
  const query: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    query[key] = value
  })

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    if (!EXCLUDED_HEADERS.has(key.toLowerCase())) {
      headers[key] = value
    }
  })

  // Clone the request before reading body since Request body can only be read once
  const cloned = request.clone()
  let body: unknown = null
  try {
    const text = await cloned.text()
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    }
  } catch {
    body = null
  }

  return {
    source: 'webhook',
    method: request.method,
    headers,
    body,
    query,
    triggered_at: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Webhook Request Handler (testable core logic)
// ---------------------------------------------------------------------------

export interface WebhookHandlerResult {
  status: number
  body: Record<string, unknown>
}

export async function handleWebhookRequest(
  token: string,
  request: Request,
  supabase: SupabaseClient<Database>
): Promise<WebhookHandlerResult> {
  // 1. Look up the trigger by webhook_token in JSONB config
  const { data: trigger, error: triggerError } = await supabase
    .from('workflow_triggers')
    .select('id, workflow_id, type, config')
    .eq('type', 'webhook')
    .filter('config->>webhook_token', 'eq', token)
    .single()

  if (triggerError || !trigger) {
    return { status: 404, body: { error: 'Webhook not found' } }
  }

  // 2. Cast config
  const config = trigger.config as unknown as WebhookTriggerConfig

  // 3. Validate HTTP method
  if (!validateWebhookMethod(config, request).valid) {
    return { status: 405, body: { error: 'Method not allowed' } }
  }

  // 4. Validate secret
  if (!validateWebhookSecret(config, request).valid) {
    return { status: 401, body: { error: 'Invalid or missing webhook secret' } }
  }

  // 5. Load workflow and verify it's published
  const { data: workflow } = await supabase
    .from('workflows')
    .select('id, name, status')
    .eq('id', trigger.workflow_id)
    .single()

  if (!workflow || workflow.status !== 'published') {
    return { status: 404, body: { error: 'Webhook not found' } }
  }

  // 6. Load workflow steps ordered by position ascending
  const { data: steps, error: stepsError } = await supabase
    .from('workflow_steps')
    .select('id, position, type, name, config')
    .eq('workflow_id', workflow.id)
    .order('position', { ascending: true })

  if (stepsError || !steps || steps.length === 0) {
    return { status: 400, body: { error: 'Workflow has no steps' } }
  }

  // 7. Capture webhook payload
  const triggerData = await captureWebhookPayload(request)

  // 8. Create workflow run
  const { data: run, error: runError } = await supabase
    .from('workflow_runs')
    .insert({
      workflow_id: workflow.id,
      status: 'pending',
      trigger_type: 'webhook',
      trigger_data: triggerData as Json,
      steps_used: 0,
      ai_credits_used: 0,
    })
    .select('id')
    .single()

  if (runError || !run) {
    return { status: 500, body: { error: 'Failed to create workflow run' } }
  }

  // 9. Create run steps (one per workflow step, all pending)
  const runSteps = steps.map((step) => ({
    run_id: run.id,
    step_id: step.id,
    step_position: step.position,
    step_type: step.type,
    status: 'pending' as const,
    input: {},
    output: {},
  }))

  const { error: runStepsError } = await supabase.from('workflow_run_steps').insert(runSteps)

  if (runStepsError) {
    return { status: 500, body: { error: 'Failed to create run steps' } }
  }

  // 10. Mark run as running
  await supabase
    .from('workflow_runs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', run.id)

  // 11. Execute workflow using the shared function
  const result = await executeWorkflowSteps(
    supabase,
    run.id,
    workflow.id,
    steps.map((step) => ({
      ...step,
      config: step.config as Record<string, unknown> | null,
    }))
  )

  // 11. Return response with configured status code
  const statusCode = config.response_status || 200
  const responseMode = config.response_mode ?? 'final'

  // Build output based on response_mode
  let responseOutput: unknown = null
  if (result.outputs && Object.keys(result.outputs).length > 0) {
    if (responseMode === 'all_steps') {
      responseOutput = result.outputs
    } else {
      // final: return only the last step's output
      const keys = Object.keys(result.outputs).sort()
      const lastKey = keys[keys.length - 1]
      responseOutput =
        (result.outputs[lastKey] as { output?: unknown })?.output ?? result.outputs[lastKey]
    }
  }

  if (result.success) {
    return { status: statusCode, body: { success: true, run_id: run.id, output: responseOutput } }
  } else {
    return {
      status: statusCode,
      body: { success: false, run_id: run.id, error: result.error, output: responseOutput },
    }
  }
}

// ---------------------------------------------------------------------------
// Shared Step Execution Loop
// ---------------------------------------------------------------------------

export async function executeWorkflowSteps(
  supabase: SupabaseClient<Database>,
  runId: string,
  workflowId: string,
  steps: Array<{
    id: string
    position: number
    type: string
    name: string
    config: Record<string, unknown> | null
  }>
): Promise<{ success: boolean; error?: string; outputs?: Record<string, unknown> }> {
  let totalAICreditsUsed = 0
  const stepOutputs: Record<string, unknown> = {}

  for (const step of steps) {
    const startTime = Date.now()

    await supabase
      .from('workflow_run_steps')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('run_id', runId)
      .eq('step_id', step.id)

    let stepOutput: Database['public']['Tables']['workflow_run_steps']['Row']['output'] = null
    let stepError: string | null = null
    let stepStatus: 'completed' | 'failed' = 'completed'

    try {
      switch (step.type) {
        case 'ai': {
          const result = await executeAIStep(step.config as unknown as AIStepConfig)
          if (result.success) {
            stepOutput = {
              content: result.content,
              model: result.model ?? null,
              usage: result.usage
                ? {
                    prompt_tokens: result.usage.prompt_tokens,
                    completion_tokens: result.usage.completion_tokens,
                    total_tokens: result.usage.total_tokens,
                  }
                : null,
            }
            if (result.usage) {
              totalAICreditsUsed += result.usage.total_tokens
            }
          } else {
            stepStatus = 'failed'
            stepError = result.error || 'AI execution failed'
          }
          break
        }
        case 'http': {
          const result = await executeHTTPStep(step.config as unknown as HTTPStepConfig)
          if (result.success) {
            stepOutput = { status: result.status, body: result.body, headers: result.headers }
          } else {
            stepStatus = 'failed'
            stepError = result.error || 'HTTP request failed'
          }
          break
        }
        case 'flow_control': {
          const result = await executeFlowControlStep(
            step.config as unknown as FlowControlStepConfig,
            stepOutputs
          )
          stepOutput = result as unknown as typeof stepOutput
          break
        }
        case 'web_scraping': {
          const result = await executeWebScrapingStep(
            step.config as unknown as WebScrapingStepConfig
          )
          if (result.success) {
            stepOutput = {
              content: result.content,
              metadata: (result.metadata ?? null) as Record<string, unknown> | null,
              links: (result.links ?? null) as Array<{ url: string; title?: string }> | null,
              url: result.url,
            } as unknown as typeof stepOutput
          } else {
            stepStatus = 'failed'
            stepError = result.error || 'Web scraping failed'
          }
          break
        }
        case 'human_in_loop': {
          stepOutput = {
            skipped: true,
            reason: 'Human-in-loop steps are not supported in automated runs',
          }
          break
        }
        case 'utility': {
          try {
            const result = executeUtilityStep(
              step.config as unknown as UtilityStepConfig,
              stepOutputs as Record<string, unknown>
            )
            stepOutput = result as unknown as typeof stepOutput
          } catch (err) {
            stepStatus = 'failed'
            stepError = err instanceof Error ? err.message : 'Utility step failed'
          }
          break
        }
        case 'sequence': {
          try {
            const seqConfig = step.config as unknown as SequenceStepConfig
            if (!seqConfig.workflow_id) {
              throw new Error('Sequence step requires a workflow_id')
            }
            if (seqConfig.workflow_id === workflowId) {
              throw new Error('A workflow cannot reference itself as a sub-workflow')
            }

            const { data: subSteps, error: subError } = await supabase
              .from('workflow_steps')
              .select('id, position, type, name, config')
              .eq('workflow_id', seqConfig.workflow_id)
              .order('position', { ascending: true })

            if (subError || !subSteps || subSteps.length === 0) {
              throw new Error(
                `Sub-workflow "${seqConfig.workflow_name || seqConfig.workflow_id}" has no steps`
              )
            }

            const result = await executeSequenceStep(
              seqConfig.workflow_id,
              seqConfig.workflow_name || seqConfig.workflow_id,
              subSteps.map((s) => ({
                ...s,
                config: s.config as Record<string, unknown>,
              })),
              stepOutputs as Record<string, unknown>,
              async (type, cfg, ctx) => {
                switch (type) {
                  case 'ai':
                    return executeAIStep(cfg as unknown as AIStepConfig)
                  case 'http':
                    return executeHTTPStep(cfg as unknown as HTTPStepConfig)
                  case 'flow_control':
                    return executeFlowControlStep(cfg as unknown as FlowControlStepConfig, ctx)
                  case 'utility':
                    return executeUtilityStep(cfg as unknown as UtilityStepConfig, ctx)
                  case 'web_scraping':
                    return executeWebScrapingStep(cfg as unknown as WebScrapingStepConfig)
                  case 'human_in_loop':
                    throw new Error('Human-in-loop steps are not supported in automated runs')
                  case 'sequence':
                    throw new Error('Nested sub-workflows are not supported')
                  default:
                    return { result: `Executed ${type} step` }
                }
              }
            )
            stepOutput = result as unknown as typeof stepOutput
          } catch (err) {
            stepStatus = 'failed'
            stepError = err instanceof Error ? err.message : 'Sequence step failed'
          }
          break
        }
        default:
          stepOutput = { result: `Step "${step.name}" executed (type: ${step.type})` }
      }
    } catch (err) {
      stepStatus = 'failed'
      stepError = err instanceof Error ? err.message : 'Unknown execution error'
    }

    const durationMs = Date.now() - startTime

    await supabase
      .from('workflow_run_steps')
      .update({
        status: stepStatus,
        output: stepOutput,
        error: stepError,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
      })
      .eq('run_id', runId)
      .eq('step_id', step.id)

    if (stepOutput) {
      stepOutputs[`step_${step.position + 1}`] = { output: stepOutput }
    }

    if (stepStatus === 'failed') {
      await supabase
        .from('workflow_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: `Step "${step.name}" failed: ${stepError}`,
          steps_used: step.position,
          ai_credits_used: totalAICreditsUsed,
        })
        .eq('id', runId)

      return {
        success: false,
        error: `Step "${step.name}" failed: ${stepError}`,
        outputs: stepOutputs,
      }
    }
  }

  // Mark run completed
  await supabase
    .from('workflow_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      steps_used: steps.length,
      ai_credits_used: totalAICreditsUsed,
    })
    .eq('id', runId)

  return { success: true, outputs: stepOutputs }
}
