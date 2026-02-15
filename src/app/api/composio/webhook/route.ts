import { NextRequest, NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio/client'
import { executePipeline } from '@/lib/workflows/pipeline-executor'
import { executeVisualWorkflowSteps } from '@/lib/workflows/execute-visual-steps'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

/**
 * Extract trigger fields from Composio webhook payload (handles V2 and V3 formats).
 *
 * V3 (current): { type: "composio.trigger.message", metadata: { trigger_slug, log_id, ... }, data }
 * V2 (legacy):  { type: "<trigger_slug>", log_id, data }
 */
function extractPayloadFields(body: Record<string, unknown>): {
  triggerSlug: string
  eventLogId: string
  triggerData: Record<string, unknown>
  metadata: Record<string, unknown> | undefined
} {
  const metadata = body.metadata as Record<string, unknown> | undefined

  // V3: type is "composio.trigger.message", slug lives in metadata
  if (body.type === 'composio.trigger.message' && metadata) {
    return {
      triggerSlug: (metadata.trigger_slug as string) ?? '',
      eventLogId: (metadata.log_id as string) ?? (body.id as string) ?? '',
      triggerData: (body.data as Record<string, unknown>) ?? {},
      metadata,
    }
  }

  // V2 / legacy: type IS the trigger slug, log_id at top level
  return {
    triggerSlug: (body.type as string) ?? '',
    eventLogId: (body.log_id as string) ?? '',
    triggerData: (body.data as Record<string, unknown>) ?? {},
    metadata,
  }
}

/**
 * Composio webhook endpoint - receives ALL trigger event callbacks
 * and routes them to matching subscriptions in BOTH systems:
 *   1. Agent workflow subscriptions (trigger_subscriptions table)
 *   2. Visual editor workflows (workflow_triggers table with type='app')
 *
 * Contract: POST /api/composio/webhook
 * - Verifies webhook signature using Composio SDK
 * - Extracts trigger slug and data from V2/V3 payload
 * - Checks idempotency via event_log_id
 * - Looks up matching subscriptions in both systems
 * - Executes workflows for each match
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook signature using Composio SDK
    const webhookSecret = process.env.COMPOSIO_TRIGGER_KEY
    const rawBody = await request.text()

    if (webhookSecret) {
      const composio = getComposio()
      const webhookId = request.headers.get('webhook-id')
      const webhookTimestamp = request.headers.get('webhook-timestamp')
      const webhookSignature = request.headers.get('webhook-signature')

      if (!webhookId || !webhookTimestamp || !webhookSignature) {
        return NextResponse.json({ error: 'Missing webhook signature headers' }, { status: 401 })
      }

      try {
        await composio.triggers.verifyWebhook({
          id: webhookId,
          payload: rawBody,
          signature: webhookSignature,
          timestamp: webhookTimestamp,
          secret: webhookSecret,
        })
      } catch {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }
    }

    // 2. Parse payload (supports V2 and V3 formats)
    const body = JSON.parse(rawBody) as Record<string, unknown>
    const { triggerSlug, eventLogId, triggerData, metadata } = extractPayloadFields(body)

    if (!triggerSlug) {
      return NextResponse.json({ error: 'Missing trigger slug in payload' }, { status: 400 })
    }

    // 3. Initialize service role client (bypasses RLS)
    const supabase = createServiceRoleClient()

    let runsCreated = 0

    // -----------------------------------------------------------------------
    // 4. Agent workflow subscriptions (trigger_subscriptions)
    // -----------------------------------------------------------------------
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('trigger_subscriptions')
      .select('*')
      .eq('trigger_slug', triggerSlug)
      .eq('is_enabled', true)

    if (subscriptionError) {
      console.error('Failed to fetch trigger subscriptions:', subscriptionError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Process each matching agent workflow subscription
    for (const subscription of subscriptions ?? []) {
      try {
        // Check idempotency
        if (eventLogId) {
          const { data: existingRun } = await supabase
            .from('agent_workflow_runs')
            .select('id')
            .eq('event_log_id', eventLogId)
            .eq('workflow_id', subscription.agent_workflow_id)
            .single()

          if (existingRun) {
            console.log(
              `Duplicate event ${eventLogId} for agent workflow ${subscription.agent_workflow_id}, skipping`
            )
            continue
          }
        }

        // Load the linked workflow
        const { data: workflowData, error: workflowError } = await supabase
          .from('agent_workflows')
          .select('*')
          .eq('id', subscription.agent_workflow_id)
          .single()

        if (workflowError || !workflowData) {
          console.error(`Failed to load workflow ${subscription.agent_workflow_id}:`, workflowError)
          continue
        }

        if (!workflowData.is_enabled) {
          console.log(`Workflow ${workflowData.id} is disabled, skipping`)
          continue
        }

        const workflow = workflowData as unknown as import('@/lib/workflows/types').AgentWorkflowRow

        // Apply event filters
        const filters = subscription.filters as unknown as
          | import('@/lib/workflows/types').WorkflowCondition[]
          | null
        if (filters && Array.isArray(filters) && filters.length > 0) {
          const { evaluateConditions } = await import('@/lib/workflows/condition-engine')
          const conditionResult = evaluateConditions(filters, triggerData)
          if (!conditionResult.passed) {
            console.log(`Event ${eventLogId} filtered out for subscription ${subscription.id}`)
            continue
          }
        }

        // Apply field mappings
        let mappedTriggerData = { ...triggerData }
        const fieldMappings = subscription.field_mappings as unknown as Record<
          string,
          string
        > | null
        if (
          fieldMappings &&
          typeof fieldMappings === 'object' &&
          Object.keys(fieldMappings).length > 0
        ) {
          const mapped: Record<string, unknown> = {}
          for (const [targetKey, sourcePath] of Object.entries(fieldMappings)) {
            const value = sourcePath.split('.').reduce<unknown>((obj, key) => {
              if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
                return (obj as Record<string, unknown>)[key]
              }
              return undefined
            }, triggerData)
            if (value !== undefined) {
              mapped[targetKey] = value
            }
          }
          mappedTriggerData = { ...triggerData, ...mapped }
        }

        // Execute the pipeline
        console.log(`Executing agent workflow ${workflow.id} for event ${eventLogId}`)

        try {
          await executePipeline({
            workflow,
            triggerData: mappedTriggerData,
            userId: subscription.user_id,
            eventLogId,
            supabaseClient: supabase,
          })
          runsCreated++
        } catch (execError) {
          const errorMessage = execError instanceof Error ? execError.message : String(execError)
          const isAuthError = /auth|token|expired|unauthorized|403|401/i.test(errorMessage)

          if (isAuthError) {
            console.error(
              `Auth error for subscription ${subscription.id}: ${errorMessage}. User may need to reconnect the app.`
            )
            await supabase.from('agent_workflow_runs').insert({
              workflow_id: subscription.agent_workflow_id,
              agent_id: workflow.agent_id,
              status: 'failed',
              trigger_data: mappedTriggerData as unknown as Json,
              error: `Authentication expired for ${subscription.app_id}. Please reconnect the app in Settings to resume this trigger.`,
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              duration_ms: 0,
              event_log_id: eventLogId,
            })
          } else {
            throw execError
          }
        }

        // Update subscription stats
        await supabase
          .from('trigger_subscriptions')
          .update({
            last_event_at: new Date().toISOString(),
            event_count: subscription.event_count + 1,
          })
          .eq('id', subscription.id)
      } catch (error) {
        console.error(`Failed to process subscription ${subscription.id}:`, error)
      }
    }

    // -----------------------------------------------------------------------
    // 5. Visual editor workflows (workflow_triggers with type='app')
    // -----------------------------------------------------------------------
    try {
      // Look up workflow_triggers where type='app' and the config event matches
      const { data: visualTriggers } = await supabase
        .from('workflow_triggers')
        .select('id, workflow_id, config')
        .eq('type', 'app')

      if (visualTriggers && visualTriggers.length > 0) {
        // Filter to those matching the trigger slug
        const matchingTriggers = visualTriggers.filter((vt) => {
          const config = vt.config as Record<string, unknown>
          return config.event === triggerSlug
        })

        for (const vt of matchingTriggers) {
          try {
            // Load the workflow to check status and get created_by
            const { data: workflow } = await supabase
              .from('workflows')
              .select('id, status, created_by, name')
              .eq('id', vt.workflow_id)
              .single()

            if (!workflow || workflow.status !== 'published') {
              continue
            }

            // Idempotency: check if this event already created a run for this workflow
            if (eventLogId) {
              const { data: dupeCheck } = await supabase
                .from('workflow_runs')
                .select('id')
                .eq('workflow_id', vt.workflow_id)
                .filter('trigger_data->>event_log_id', 'eq', eventLogId)
                .limit(1)

              if (dupeCheck && dupeCheck.length > 0) {
                console.log(
                  `Duplicate event ${eventLogId} for visual workflow ${vt.workflow_id}, skipping`
                )
                continue
              }
            }

            // Load steps to create run step records
            const { data: steps } = await supabase
              .from('workflow_steps')
              .select('id, position, type, name, config')
              .eq('workflow_id', vt.workflow_id)
              .order('position', { ascending: true })

            if (!steps || steps.length === 0) {
              continue
            }

            // Create workflow run
            const { data: run, error: runError } = await supabase
              .from('workflow_runs')
              .insert({
                workflow_id: vt.workflow_id,
                status: 'pending',
                trigger_type: 'app',
                trigger_data: {
                  ...triggerData,
                  event_log_id: eventLogId,
                  trigger_slug: triggerSlug,
                  metadata,
                } as unknown as Json,
                steps_used: 0,
                ai_credits_used: 0,
              })
              .select()
              .single()

            if (runError || !run) {
              console.error(`Failed to create visual workflow run for ${vt.workflow_id}:`, runError)
              continue
            }

            // Create workflow_run_steps records
            const runSteps = steps.map((step) => ({
              run_id: run.id,
              step_id: step.id,
              step_position: step.position,
              step_type: step.type,
              status: 'pending' as const,
              input: {},
              output: {},
            }))

            const { error: runStepsError } = await supabase
              .from('workflow_run_steps')
              .insert(runSteps)

            if (runStepsError) {
              console.error(`Failed to create run steps for ${vt.workflow_id}:`, runStepsError)
              continue
            }

            // Execute the visual workflow
            console.log(
              `Executing visual workflow ${workflow.name} (${vt.workflow_id}) for event ${eventLogId}`
            )

            const result = await executeVisualWorkflowSteps({
              workflowId: vt.workflow_id,
              runId: run.id,
              userId: workflow.created_by,
              triggerData,
              supabase,
            })

            if (result.success) {
              runsCreated++
            } else {
              console.error(`Visual workflow ${vt.workflow_id} execution failed:`, result.error)
            }
          } catch (error) {
            console.error(`Failed to process visual workflow trigger ${vt.id}:`, error)
          }
        }
      }
    } catch (error) {
      console.error('Failed to process visual workflow triggers:', error)
      // Don't fail the whole request — agent workflows may have succeeded
    }

    // -----------------------------------------------------------------------
    // 6. Return result
    // -----------------------------------------------------------------------
    if (runsCreated === 0 && (!subscriptions || subscriptions.length === 0)) {
      return NextResponse.json({ status: 'no_subscription' }, { status: 200 })
    }

    return NextResponse.json({ status: 'ok', runs_created: runsCreated }, { status: 200 })
  } catch (error) {
    console.error('Composio webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
