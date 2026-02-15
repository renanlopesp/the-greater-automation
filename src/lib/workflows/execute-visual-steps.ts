import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { executeAIStep } from '@/lib/ai/chat'
import { executeHTTPStep } from '@/lib/ai/http-executor'
import { executeFlowControlStep } from '@/lib/workflow-editor/flow-control-executor'
import { executeWebScrapingStep } from '@/lib/workflow-editor/web-scraping-executor'
import {
  createHumanApproval,
  getApprovalForStep,
} from '@/lib/workflow-editor/human-in-loop-executor'
import { executeUtilityStep } from '@/lib/workflow-editor/utility-executor'
import { executeSequenceStep } from '@/lib/workflow-editor/sequence-executor'
import { getComposio } from '@/lib/composio/client'
import type {
  AIStepConfig,
  HTTPStepConfig,
  AppStepConfig,
  FlowControlStepConfig,
  WebScrapingStepConfig,
  HumanInLoopStepConfig,
  UtilityStepConfig,
  SequenceStepConfig,
} from '@/lib/workflow-editor/step-defaults'

type TypedClient = SupabaseClient<Database>

export interface ExecuteVisualWorkflowParams {
  workflowId: string
  runId: string
  userId: string
  triggerData?: Record<string, unknown>
  supabase: TypedClient
}

export interface ExecuteVisualWorkflowResult {
  success: boolean
  waiting?: boolean
  approval_id?: string
  step_name?: string
  prompt?: string
  error?: string
}

/**
 * Core execution logic for visual workflow runs.
 * Shared between the API execute endpoint (user-initiated) and the
 * Composio webhook handler (event-triggered).
 */
export async function executeVisualWorkflowSteps(
  params: ExecuteVisualWorkflowParams
): Promise<ExecuteVisualWorkflowResult> {
  const { workflowId, runId, userId, supabase } = params

  try {
    // Verify run exists and is in pending or waiting status (waiting = resume)
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .select('id, status, workflow_id')
      .eq('id', runId)
      .eq('workflow_id', workflowId)
      .single()

    if (runError || !run) {
      return { success: false, error: 'Run not found' }
    }

    if (run.status !== 'pending' && run.status !== 'waiting') {
      return { success: false, error: `Run is already ${run.status}` }
    }

    // Load workflow steps
    const { data: steps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('id, position, type, name, config')
      .eq('workflow_id', workflowId)
      .order('position', { ascending: true })

    if (stepsError || !steps || steps.length === 0) {
      await supabase
        .from('workflow_runs')
        .update({
          status: 'failed',
          error: 'No steps configured',
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId)
      return { success: false, error: 'No steps configured' }
    }

    // Mark run as running
    await supabase
      .from('workflow_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', runId)

    // Execute steps sequentially
    let totalAICreditsUsed = 0

    // Context accumulation: store step outputs for flow control conditions
    const stepOutputs: Record<string, unknown> = {}

    // Inject trigger data as context if provided
    if (params.triggerData) {
      stepOutputs['trigger'] = params.triggerData
    }

    for (const step of steps) {
      // Check if step already completed (resume scenario — skip completed steps)
      const { data: existingStep } = await supabase
        .from('workflow_run_steps')
        .select('status, output')
        .eq('run_id', runId)
        .eq('step_id', step.id)
        .single()

      if (existingStep?.status === 'completed') {
        // Restore output to context and skip
        if (existingStep.output) {
          stepOutputs[`step_${step.position + 1}`] = { output: existingStep.output }
        }
        continue
      }

      const startTime = Date.now()

      // Mark step running
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
            const result = await executeAIStep(
              step.config as unknown as AIStepConfig,
              stepOutputs as Record<string, unknown>
            )
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
            const config = step.config as unknown as HumanInLoopStepConfig

            // Check if approval already exists and was responded to (resume scenario)
            const existing = await getApprovalForStep(runId, step.position)
            if (existing && existing.status !== 'pending') {
              stepOutput = {
                action_type: config.action_type,
                status: existing.status,
                response: existing.response,
                responded_by: existing.responded_by,
                responded_at: existing.responded_at,
              } as unknown as typeof stepOutput

              if (existing.status === 'rejected') {
                stepStatus = 'failed'
                const resp = existing.response as { comment?: string } | null
                stepError = resp?.comment || 'Approval rejected'
              }
              break
            }

            // No existing approval or still pending — create and pause
            const result = await createHumanApproval(
              config,
              runId,
              step.id,
              step.position,
              workflowId,
              config.include_context ? (stepOutputs as Record<string, unknown>) : {}
            )

            if (!result.success) {
              stepStatus = 'failed'
              stepError = result.error || 'Failed to create approval request'
              break
            }

            // PAUSE: Mark step as waiting_for_input, mark run as waiting, return early
            await supabase
              .from('workflow_run_steps')
              .update({
                status: 'waiting_for_input',
                started_at: new Date().toISOString(),
                output: {
                  approval_id: result.approval_id,
                  prompt: config.prompt,
                  action_type: config.action_type,
                },
              })
              .eq('run_id', runId)
              .eq('step_id', step.id)

            await supabase
              .from('workflow_runs')
              .update({ status: 'waiting', error: null })
              .eq('id', runId)

            return {
              success: true,
              waiting: true,
              approval_id: result.approval_id,
              step_name: step.name,
              prompt: config.prompt,
            }
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
                      throw new Error('Human-in-loop steps are not supported inside sub-workflows')
                    case 'app': {
                      const ac = cfg as unknown as AppStepConfig
                      if (!ac.app_id || !ac.action)
                        throw new Error('App step requires app_id and action')
                      const { data: conn } = await supabase
                        .from('app_connections')
                        .select('composio_connection_id')
                        .eq('user_id', userId)
                        .eq('app_id', ac.app_id)
                        .single()
                      if (!conn?.composio_connection_id)
                        throw new Error(`No ${ac.app_id} connection found`)
                      const res = await getComposio().tools.execute(ac.action, {
                        connectedAccountId: conn.composio_connection_id,
                        arguments: ac.inputs ?? {},
                      })
                      const ar = res as { successful?: boolean; data?: unknown; error?: string }
                      if (!ar.successful)
                        throw new Error(ar.error || `${ac.app_id} ${ac.action} failed`)
                      return ar.data
                    }
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
          case 'app': {
            const appConfig = step.config as unknown as AppStepConfig
            if (!appConfig.app_id || !appConfig.action) {
              stepStatus = 'failed'
              stepError = 'App step requires app_id and action'
            } else {
              const { data: connection } = await supabase
                .from('app_connections')
                .select('composio_connection_id')
                .eq('user_id', userId)
                .eq('app_id', appConfig.app_id)
                .single()

              if (!connection?.composio_connection_id) {
                stepStatus = 'failed'
                stepError = `No ${appConfig.app_id} connection found. Connect the app in Settings.`
              } else {
                const composio = getComposio()
                const result = await composio.tools.execute(appConfig.action, {
                  connectedAccountId: connection.composio_connection_id,
                  arguments: appConfig.inputs ?? {},
                })

                const appResult = result as {
                  successful?: boolean
                  data?: unknown
                  error?: string
                }

                if (appResult.successful) {
                  stepOutput = appResult.data as typeof stepOutput
                } else {
                  stepStatus = 'failed'
                  stepError = appResult.error || `${appConfig.app_id} ${appConfig.action} failed`
                }
              }
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

      // Accumulate step output for context
      if (stepOutput) {
        stepOutputs[`step_${step.position + 1}`] = { output: stepOutput }
      }

      // If step failed, mark the entire run as failed
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
        return { success: false, error: stepError ?? undefined }
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

    return { success: true }
  } catch (error) {
    console.error('Error executing visual workflow run:', error)

    // Attempt to mark run as failed (ignore errors here)
    try {
      await supabase
        .from('workflow_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Internal execution error',
        })
        .eq('id', runId)
    } catch {
      // best-effort
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }
  }
}
