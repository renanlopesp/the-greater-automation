import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { executeAIStep } from '@/lib/ai/chat'
import { tokensToCredits } from '@/lib/billing/credits'
import { executeHTTPStep } from '@/lib/ai/http-executor'
import { executeFlowControlStep } from '@/lib/workflow-editor/flow-control-executor'
import { executeWebScrapingStep } from '@/lib/workflow-editor/web-scraping-executor'
import {
  createHumanApproval,
  getApprovalForStep,
} from '@/lib/workflow-editor/human-in-loop-executor'
import { executeUtilityStep, resolveTemplate } from '@/lib/workflow-editor/utility-executor'
import { sendMessage } from '@/lib/messaging/telegram'
import { executeSequenceStep } from '@/lib/workflow-editor/sequence-executor'
import { getComposio } from '@/lib/composio/client'
import { createWorkflowNotification } from '@/lib/notifications/create-workflow-notification'
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
          stepOutputs[`step_${step.position + 2}`] = { output: existingStep.output }
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
                totalAICreditsUsed += tokensToCredits(result.usage.total_tokens)
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
            const utilConfig = step.config as unknown as UtilityStepConfig
            if (utilConfig.utility_type === 'send_telegram') {
              // send_telegram needs I/O — handled here instead of in pure utility-executor
              const template = utilConfig.telegram_template ?? ''
              const resolvedMessage = resolveTemplate(
                template,
                stepOutputs as Record<string, unknown>
              )

              // Look up team_id from workflow
              const { data: wf } = await supabase
                .from('workflows')
                .select('team_id')
                .eq('id', workflowId)
                .single()

              if (!wf?.team_id) {
                stepStatus = 'failed'
                stepError = 'Cannot determine workflow team for Telegram delivery'
                break
              }

              // Find verified Telegram link for this team
              const { data: link } = await supabase
                .from('messaging_links')
                .select('external_chat_id')
                .eq('team_id', wf.team_id)
                .eq('channel_type', 'telegram')
                .eq('is_verified', true)
                .single()

              if (!link?.external_chat_id) {
                stepStatus = 'failed'
                stepError =
                  'No verified Telegram link found for this team. Link your Telegram first.'
                break
              }

              await sendMessage(
                link.external_chat_id,
                resolvedMessage,
                utilConfig.telegram_parse_mode
              )

              stepOutput = {
                sent: true,
                chat_id: link.external_chat_id,
                message: resolvedMessage,
              } as unknown as typeof stepOutput
            } else {
              try {
                const result = executeUtilityStep(
                  utilConfig,
                  stepOutputs as Record<string, unknown>
                )
                stepOutput = result as unknown as typeof stepOutput
              } catch (err) {
                stepStatus = 'failed'
                stepError = err instanceof Error ? err.message : 'Utility step failed'
              }
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

                      // Nuvemshop: direct API (not Composio)
                      if (ac.app_id === 'nuvemshop') {
                        const { data: wfForSeq } = await supabase
                          .from('workflows')
                          .select('team_id')
                          .eq('id', workflowId)
                          .single()
                        if (!wfForSeq?.team_id)
                          throw new Error('Cannot determine workflow team for Nuvemshop')
                        const { data: seqStore } = await supabase
                          .from('stores')
                          .select('id, platform_store_id, platform_access_token')
                          .eq('team_id', wfForSeq.team_id)
                          .eq('platform', 'nuvemshop')
                          .single()
                        if (!seqStore?.platform_access_token || !seqStore?.platform_store_id)
                          throw new Error('No connected Nuvemshop store found for this team.')
                        const { NuvemshopClient: NsClient } = await import('@/lib/nuvemshop/client')
                        const nsClient = new NsClient(
                          seqStore.platform_store_id,
                          seqStore.platform_access_token
                        )
                        switch (ac.action) {
                          case 'NUVEMSHOP_GET_PRODUCTS':
                            return await nsClient.getAllProducts()
                          case 'NUVEMSHOP_GET_ORDERS':
                            return await nsClient.getOrders(
                              1,
                              50,
                              ac.inputs as { created_at_min?: string } | undefined
                            )
                          case 'NUVEMSHOP_GET_CUSTOMERS':
                            return await nsClient.getCustomers(
                              ac.inputs as { q?: string } | undefined
                            )
                          case 'NUVEMSHOP_GET_CATEGORIES':
                            return await nsClient.getCategories()
                          case 'NUVEMSHOP_GET_ABANDONED_CHECKOUTS':
                            return await nsClient.getAbandonedCheckouts()
                          case 'NUVEMSHOP_GET_COUPONS':
                            return await nsClient.getCoupons()
                          case 'NUVEMSHOP_GET_STORE_INFO':
                            return await nsClient.getStoreInfo()
                          default:
                            throw new Error(`Unknown Nuvemshop action: ${ac.action}`)
                        }
                      }

                      const { data: conn } = await supabase
                        .from('app_connections')
                        .select('composio_connection_id')
                        .eq('user_id', userId)
                        .eq('app_id', ac.app_id)
                        .single()
                      if (!conn?.composio_connection_id)
                        throw new Error(`No ${ac.app_id} connection found`)
                      const composioClient = getComposio()
                      const rawTools = await composioClient.tools.getRawComposioTools({
                        toolkits: [ac.app_id],
                        limit: 500,
                      })
                      const rawToolsBySlug = new Map(rawTools.map((t) => [t.slug, t]))
                      const meta = rawToolsBySlug.get(ac.action)
                      const res = await composioClient.tools.execute(ac.action, {
                        connectedAccountId: conn.composio_connection_id,
                        userId,
                        arguments: ac.inputs ?? {},
                        ...(meta?.version ? { version: meta.version } : {}),
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
            } else if (appConfig.app_id === 'nuvemshop') {
              // Nuvemshop: direct API calls (not via Composio)
              const { data: wfForStore } = await supabase
                .from('workflows')
                .select('team_id')
                .eq('id', workflowId)
                .single()

              if (!wfForStore?.team_id) {
                stepStatus = 'failed'
                stepError = 'Cannot determine workflow team for Nuvemshop'
              } else {
                const { data: store } = await supabase
                  .from('stores')
                  .select('id, platform_store_id, platform_access_token')
                  .eq('team_id', wfForStore.team_id)
                  .eq('platform', 'nuvemshop')
                  .single()

                if (!store?.platform_access_token || !store?.platform_store_id) {
                  stepStatus = 'failed'
                  stepError = 'No connected Nuvemshop store found for this team.'
                } else {
                  const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
                  const nuvemClient = new NuvemshopClient(
                    store.platform_store_id,
                    store.platform_access_token
                  )

                  switch (appConfig.action) {
                    case 'NUVEMSHOP_GET_PRODUCTS':
                      stepOutput =
                        (await nuvemClient.getAllProducts()) as unknown as typeof stepOutput
                      break
                    case 'NUVEMSHOP_GET_ORDERS':
                      stepOutput = (await nuvemClient.getOrders(
                        1,
                        50,
                        appConfig.inputs as { created_at_min?: string } | undefined
                      )) as unknown as typeof stepOutput
                      break
                    case 'NUVEMSHOP_GET_CUSTOMERS':
                      stepOutput = (await nuvemClient.getCustomers(
                        appConfig.inputs as { q?: string } | undefined
                      )) as unknown as typeof stepOutput
                      break
                    case 'NUVEMSHOP_GET_CATEGORIES':
                      stepOutput =
                        (await nuvemClient.getCategories()) as unknown as typeof stepOutput
                      break
                    case 'NUVEMSHOP_GET_ABANDONED_CHECKOUTS':
                      stepOutput =
                        (await nuvemClient.getAbandonedCheckouts()) as unknown as typeof stepOutput
                      break
                    case 'NUVEMSHOP_GET_COUPONS':
                      stepOutput = (await nuvemClient.getCoupons()) as unknown as typeof stepOutput
                      break
                    case 'NUVEMSHOP_GET_STORE_INFO':
                      stepOutput =
                        (await nuvemClient.getStoreInfo()) as unknown as typeof stepOutput
                      break
                    default:
                      stepStatus = 'failed'
                      stepError = `Unknown Nuvemshop action: ${appConfig.action}`
                  }
                }
              }
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

                // Look up tool version (required for manual execution)
                const tools = await composio.tools.getRawComposioTools({
                  toolkits: [appConfig.app_id],
                  limit: 500,
                })
                const toolsBySlug = new Map(tools.map((t) => [t.slug, t]))
                const toolMeta = toolsBySlug.get(appConfig.action)
                const version = toolMeta?.version

                const result = await composio.tools.execute(appConfig.action, {
                  connectedAccountId: connection.composio_connection_id,
                  userId,
                  arguments: appConfig.inputs ?? {},
                  ...(version ? { version } : {}),
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
        stepOutputs[`step_${step.position + 2}`] = { output: stepOutput }
        // Add "prev" alias so templates can use {{prev.content}} or {{prev.field}}
        // instead of the positional {{step_N.output.field}} syntax
        stepOutputs['prev'] = stepOutput

        // Price monitor hook: persist scraped price when an AI step extracts a price
        // from a workflow linked to a store_price_monitors entry
        if (step.type === 'ai' && stepStatus === 'completed') {
          try {
            const { data: linkedMonitor } = await supabase
              .from('store_price_monitors')
              .select('id')
              .eq('workflow_id', workflowId)
              .eq('is_active', true)
              .limit(1)
              .single()

            if (linkedMonitor) {
              const content = (stepOutput as Record<string, unknown>)?.content
              if (typeof content === 'string') {
                const { extractPriceFromText, persistScrapedPrice } =
                  await import('@/lib/retail/price-monitor')
                const price = extractPriceFromText(content)
                if (price !== null) {
                  const result = await persistScrapedPrice(linkedMonitor.id, price)
                  if (result.alert) {
                    // Inject alert into step output so the next telegram step picks it up
                    ;(stepOutput as Record<string, unknown>).price_alert = result.alert
                  }
                }
              }
            }
          } catch {
            // Non-critical — don't fail the workflow
          }
        }
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

        // Fire-and-forget notification for failed run
        const { data: workflow } = await supabase
          .from('workflows')
          .select('name, team_id')
          .eq('id', workflowId)
          .single()

        if (workflow) {
          createWorkflowNotification({
            userId,
            teamId: workflow.team_id,
            workflowId,
            workflowName: workflow.name,
            type: 'workflow_run_failed',
            extraMessage: stepError || undefined,
          }).catch(() => {})
        }

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

    // Fire-and-forget notification for completed run
    const { data: workflow } = await supabase
      .from('workflows')
      .select('name, team_id')
      .eq('id', workflowId)
      .single()

    if (workflow) {
      createWorkflowNotification({
        userId,
        teamId: workflow.team_id,
        workflowId,
        workflowName: workflow.name,
        type: 'workflow_run_completed',
      }).catch(() => {})
    }

    return { success: true }
  } catch (error) {
    console.error('Error executing visual workflow run:', error)

    const errorMessage = error instanceof Error ? error.message : 'Internal execution error'

    // Attempt to mark run as failed (ignore errors here)
    try {
      await supabase
        .from('workflow_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: errorMessage,
        })
        .eq('id', runId)
    } catch {
      // best-effort
    }

    // Fire-and-forget notification for unexpected error
    try {
      const { data: workflow } = await supabase
        .from('workflows')
        .select('name, team_id')
        .eq('id', workflowId)
        .single()

      if (workflow) {
        createWorkflowNotification({
          userId,
          teamId: workflow.team_id,
          workflowId,
          workflowName: workflow.name,
          type: 'workflow_run_failed',
          extraMessage: errorMessage,
        }).catch(() => {})
      }
    } catch {
      // best-effort
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }
  }
}
