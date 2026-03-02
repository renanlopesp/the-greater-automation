import { NextRequest, NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio/client'
import { executeVisualWorkflowSteps } from '@/lib/workflows/execute-visual-steps'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { checkUsageLimits } from '@/lib/billing/usage-check'
import type { Json } from '@/lib/supabase/database.types'

/**
 * Recursively flatten an object into a key→value map.
 * For nested objects, both the leaf key and the full dot-path are stored.
 * e.g. { activity: { snippet: { channelId: "UCxxx" } } }
 * → { "channelId": "UCxxx", "activity.snippet.channelId": "UCxxx" }
 */
function flattenObjectKeys(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = flattenObjectKeys(value as Record<string, unknown>, fullKey)
      Object.assign(result, nested)
    } else {
      result[key] = value // leaf key (e.g. "channelId")
      result[fullKey] = value // full path (e.g. "activity.snippet.channelId")
    }
  }
  return result
}

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
 * Check if trigger_config values match the incoming event data.
 * Used to filter events to the correct resource (e.g., specific YouTube channel).
 */
function matchesTriggerConfig(
  triggerConfig: Record<string, unknown>,
  triggerData: Record<string, unknown>,
  eventLogId: string,
  label: string
): boolean {
  const eventDataFlat = flattenObjectKeys(triggerData)

  for (const [configKey, configValue] of Object.entries(triggerConfig)) {
    if (configValue === null || configValue === undefined) continue
    // Skip operational keys (not data-matching keys)
    if (['interval', 'polling_interval', 'polling_frequency'].includes(configKey)) continue

    // Try to find matching key in event data (snake_case → camelCase)
    const camelKey = configKey.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    const matchingValue = eventDataFlat[camelKey] ?? eventDataFlat[configKey]

    if (matchingValue !== undefined && String(matchingValue) !== String(configValue)) {
      console.log(
        `Event ${eventLogId} filtered: ${configKey}=${matchingValue} != ${configValue} for ${label}`
      )
      return false
    }
  }

  return true
}

/**
 * Composio webhook endpoint — unified execution path.
 *
 * ALL app-event workflows (both agent-created and visual-editor-created)
 * are routed through the same execution engine (executeVisualWorkflowSteps).
 * Runs are recorded in workflow_runs + workflow_run_steps.
 *
 * Contract: POST /api/composio/webhook
 * - Verifies webhook signature using Composio SDK
 * - Extracts trigger slug and data from V2/V3 payload
 * - Finds matching workflow_triggers with config.event === triggerSlug
 * - Applies trigger_config filtering (e.g. channel_id matching)
 * - Executes workflows through the visual step engine
 * - Updates agent_workflows and trigger_subscriptions stats if applicable
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

    // 4. Process ALL matching workflows through unified path
    const result = await processWorkflows(supabase, triggerSlug, triggerData, eventLogId, metadata)

    if (result.runsCreated === 0 && result.triggersFound === 0) {
      return NextResponse.json({ status: 'no_subscription' }, { status: 200 })
    }

    return NextResponse.json({ status: 'ok', runs_created: result.runsCreated }, { status: 200 })
  } catch (error) {
    console.error('Composio webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Unified workflow processor — handles BOTH agent-created and visual-editor
// workflows through a single execution path.
// ---------------------------------------------------------------------------
async function processWorkflows(
  supabase: ReturnType<typeof createServiceRoleClient>,
  triggerSlug: string,
  triggerData: Record<string, unknown>,
  eventLogId: string,
  metadata: Record<string, unknown> | undefined
): Promise<{ runsCreated: number; triggersFound: number }> {
  let runsCreated = 0
  let triggersFound = 0

  try {
    // 1. Find all workflow_triggers matching this event slug
    const { data: matchedTriggers } = await supabase
      .from('workflow_triggers')
      .select('id, workflow_id, config')
      .eq('type', 'app')

    if (!matchedTriggers || matchedTriggers.length === 0) {
      return { runsCreated: 0, triggersFound: 0 }
    }

    const matchingTriggers = matchedTriggers.filter((vt) => {
      const config = vt.config as Record<string, unknown>
      return config.event === triggerSlug
    })

    triggersFound = matchingTriggers.length
    if (triggersFound === 0) {
      return { runsCreated: 0, triggersFound: 0 }
    }

    for (const vt of matchingTriggers) {
      try {
        // 2. Apply trigger_config filtering (e.g., channel_id matching)
        const vtConfig = vt.config as Record<string, unknown>
        const triggerConfig = vtConfig.trigger_config as Record<string, unknown> | undefined
        if (
          triggerConfig &&
          typeof triggerConfig === 'object' &&
          Object.keys(triggerConfig).length > 0
        ) {
          if (!matchesTriggerConfig(triggerConfig, triggerData, eventLogId, `trigger ${vt.id}`)) {
            continue
          }
        }

        // 3. Load the workflow and agent link in parallel (both depend only on workflow_id)
        const [{ data: workflow }, { data: agentLink }] = await Promise.all([
          supabase
            .from('workflows')
            .select('id, status, created_by, name, team_id')
            .eq('id', vt.workflow_id)
            .single(),
          supabase
            .from('agent_workflows')
            .select('id, agent_id, run_count, is_enabled')
            .eq('workflow_id', vt.workflow_id)
            .limit(1)
            .single(),
        ])

        if (!workflow || workflow.status !== 'published') continue

        // If agent-owned and disabled at agent level, skip
        if (agentLink && !agentLink.is_enabled) {
          console.log(`Agent workflow ${agentLink.id} is disabled, skipping`)
          continue
        }

        // 3a. Usage limit check + idempotency check + steps fetch in parallel
        // Usage depends on workflow.team_id (now resolved); the other two only need workflow_id.
        const [usageResult, dupeCheckResult, { data: steps }] = await Promise.all([
          checkUsageLimits(workflow.team_id),
          eventLogId
            ? supabase
                .from('workflow_runs')
                .select('id')
                .eq('workflow_id', vt.workflow_id)
                .filter('trigger_data->>event_log_id', 'eq', eventLogId)
                .limit(1)
            : Promise.resolve({ data: null }),
          supabase
            .from('workflow_steps')
            .select('id, position, type, name, config')
            .eq('workflow_id', vt.workflow_id)
            .order('position', { ascending: true }),
        ])

        if (!usageResult.allowed) {
          console.warn(
            `[composio-webhook] Usage limit exceeded for team ${workflow.team_id}: ${usageResult.reason}`
          )
          continue
        }

        // 5. Idempotency check
        if (eventLogId && dupeCheckResult.data && dupeCheckResult.data.length > 0) {
          console.log(`Duplicate event ${eventLogId} for workflow ${vt.workflow_id}, skipping`)
          continue
        }

        if (!steps || steps.length === 0) continue

        // 7. Create the workflow run (with agent_id if agent-owned)
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
            ...(agentLink ? { agent_id: agentLink.agent_id } : {}),
          })
          .select()
          .single()

        if (runError || !run) {
          console.error(`Failed to create workflow run for ${vt.workflow_id}:`, runError)
          continue
        }

        // 8. Create run step records
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
          console.error(`Failed to create run steps for ${vt.workflow_id}:`, runStepsError)
          continue
        }

        // 9. Execute the workflow
        console.log(
          `Executing workflow ${workflow.name} (${vt.workflow_id})${agentLink ? ` [agent: ${agentLink.agent_id}]` : ''} for event ${eventLogId}`
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
          console.error(`Workflow ${vt.workflow_id} execution failed:`, result.error)
        }

        // 10. Update stats for agent-owned workflows
        if (agentLink) {
          await supabase
            .from('agent_workflows')
            .update({
              last_run_at: new Date().toISOString(),
              run_count: (agentLink.run_count ?? 0) + 1,
            })
            .eq('id', agentLink.id)

          // Also update trigger_subscriptions stats
          const { data: trigSub } = await supabase
            .from('trigger_subscriptions')
            .select('id, event_count')
            .eq('agent_workflow_id', agentLink.id)
            .limit(1)
            .single()

          if (trigSub) {
            await supabase
              .from('trigger_subscriptions')
              .update({
                last_event_at: new Date().toISOString(),
                event_count: (trigSub.event_count ?? 0) + 1,
              })
              .eq('id', trigSub.id)
          }
        }
      } catch (error) {
        console.error(`Failed to process workflow trigger ${vt.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed to process workflow triggers:', error)
  }

  return { runsCreated, triggersFound }
}
