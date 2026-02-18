'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  listTriggers,
  createTrigger,
  enableTrigger,
  disableTrigger,
  deleteTrigger,
} from '@/lib/composio/triggers'
import type { Json } from '@/lib/supabase/database.types'
import { getUserTeamRole, canMutate } from '@/lib/auth/require-role'

type ActionResult = { error?: string }

// ---------------------------------------------------------------------------
// List available triggers for an app
// ---------------------------------------------------------------------------

export async function listAvailableTriggers(appId: string) {
  try {
    const triggers = await listTriggers(appId)

    return {
      triggers: triggers.map((t) => ({
        slug: t.trigger_name,
        name: t.display_name,
        description: t.description,
        config_schema: t.config_params as Record<string, unknown>,
      })),
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch available triggers',
    }
  }
}

// ---------------------------------------------------------------------------
// Create trigger subscription
// ---------------------------------------------------------------------------

export interface CreateTriggerSubscriptionInput {
  agentWorkflowId: string
  agentId: string
  triggerSlug: string
  appId: string
  triggerConfig: Record<string, unknown>
  filters?: Array<{ field: string; operator: string; value: unknown }>
  fieldMappings?: Record<string, string>
}

export async function createTriggerSubscription(params: CreateTriggerSubscriptionInput) {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to manage trigger subscriptions' }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    // Check subscription limit (50 active subscriptions per agent)
    const { count: activeCount } = await supabase
      .from('trigger_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', params.agentId)
      .eq('is_enabled', true)

    if (activeCount !== null && activeCount >= 50) {
      return {
        error:
          'Subscription limit reached (50 active subscriptions per agent). Disable or delete existing subscriptions before creating new ones.',
      }
    }

    // Get the connected account ID for this app and agent
    const { data: connection } = await supabase
      .from('app_connections')
      .select('composio_connection_id')
      .eq('app_id', params.appId)
      .single()

    if (!connection || !connection.composio_connection_id) {
      return { error: `App ${params.appId} not connected` }
    }

    // Create trigger in Composio
    const composioTriggerId = await createTrigger({
      userId: user.id,
      triggerSlug: params.triggerSlug,
      connectedAccountId: connection.composio_connection_id,
      triggerConfig: params.triggerConfig,
    })
    await enableTrigger(composioTriggerId)

    // Insert into database
    const { data: subscription, error: dbError } = await supabase
      .from('trigger_subscriptions')
      .insert({
        agent_workflow_id: params.agentWorkflowId,
        agent_id: params.agentId,
        user_id: user.id,
        composio_trigger_id: composioTriggerId,
        trigger_slug: params.triggerSlug,
        app_id: params.appId,
        trigger_config: params.triggerConfig as Json,
        filters: (params.filters as Json) ?? [],
        field_mappings: (params.fieldMappings as Json) ?? {},
        is_enabled: true,
      })
      .select('id, composio_trigger_id, trigger_slug, is_enabled')
      .single()

    if (dbError) {
      // Clean up Composio trigger if DB insert failed
      await deleteTrigger(composioTriggerId).catch(() => {
        // Ignore cleanup errors
      })
      return { error: dbError.message }
    }

    revalidatePath(`/agents/${params.agentId}`)
    return { subscription }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create trigger subscription',
    }
  }
}

// ---------------------------------------------------------------------------
// Get trigger subscriptions for an agent
// ---------------------------------------------------------------------------

export async function getTriggerSubscriptions(agentId: string) {
  const supabase = await createServerClient()

  const { data } = await supabase
    .from('trigger_subscriptions')
    .select(
      `
      id,
      agent_workflow_id,
      trigger_slug,
      app_id,
      is_enabled,
      last_event_at,
      event_count,
      agent_workflows!inner(name)
    `
    )
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })

  return {
    subscriptions: (data ?? []).map((s) => ({
      id: s.id,
      agent_workflow_id: s.agent_workflow_id,
      trigger_slug: s.trigger_slug,
      app_id: s.app_id,
      is_enabled: s.is_enabled ?? false,
      last_event_at: s.last_event_at,
      event_count: s.event_count ?? 0,
      workflow_name:
        (s.agent_workflows as unknown as { name: string } | null)?.name ?? 'Unknown Workflow',
    })),
  }
}

// ---------------------------------------------------------------------------
// Toggle trigger subscription enabled state
// ---------------------------------------------------------------------------

export async function toggleTriggerSubscription(
  subscriptionId: string,
  enabled: boolean
): Promise<{ success?: boolean } & ActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to manage trigger subscriptions' }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    // Fetch subscription to get composio_trigger_id
    const { data: subscription } = await supabase
      .from('trigger_subscriptions')
      .select('composio_trigger_id, agent_id')
      .eq('id', subscriptionId)
      .single()

    if (!subscription) {
      return { error: 'Subscription not found' }
    }

    // Update Composio
    if (enabled) {
      await enableTrigger(subscription.composio_trigger_id)
    } else {
      await disableTrigger(subscription.composio_trigger_id)
    }

    // Update database
    const { error: dbError } = await supabase
      .from('trigger_subscriptions')
      .update({ is_enabled: enabled })
      .eq('id', subscriptionId)

    if (dbError) {
      return { error: dbError.message }
    }

    revalidatePath(`/agents/${subscription.agent_id}`)
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to toggle trigger subscription',
    }
  }
}

// ---------------------------------------------------------------------------
// Delete trigger subscription
// ---------------------------------------------------------------------------

export async function deleteTriggerSubscription(
  subscriptionId: string
): Promise<{ success?: boolean } & ActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to manage trigger subscriptions' }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    // Fetch subscription to get composio_trigger_id
    const { data: subscription } = await supabase
      .from('trigger_subscriptions')
      .select('composio_trigger_id, agent_id')
      .eq('id', subscriptionId)
      .single()

    if (!subscription) {
      return { error: 'Subscription not found' }
    }

    // Delete from Composio first
    await deleteTrigger(subscription.composio_trigger_id)

    // Delete from database
    const { error: dbError } = await supabase
      .from('trigger_subscriptions')
      .delete()
      .eq('id', subscriptionId)

    if (dbError) {
      return { error: dbError.message }
    }

    revalidatePath(`/agents/${subscription.agent_id}`)
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to delete trigger subscription',
    }
  }
}

// ---------------------------------------------------------------------------
// Retry workflow run
// ---------------------------------------------------------------------------

export async function retryWorkflowRun(runId: string) {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to retry workflow runs' }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    // Load original run from workflow_runs (unified table)
    const { data: originalRun } = await supabase
      .from('workflow_runs')
      .select('*, workflows(id, name, status, created_by)')
      .eq('id', runId)
      .single()

    if (!originalRun) return { error: 'Run not found' }
    if (originalRun.status !== 'failed') return { error: 'Can only retry failed runs' }

    const workflowId = originalRun.workflow_id
    const triggerData = (originalRun.trigger_data as Record<string, unknown>) || {}

    // Load workflow steps
    const { data: steps } = await supabase
      .from('workflow_steps')
      .select('id, position, type, name, config')
      .eq('workflow_id', workflowId)
      .order('position', { ascending: true })

    if (!steps || steps.length === 0) return { error: 'No steps configured' }

    // Create new run
    const { data: newRun, error: runError } = await supabase
      .from('workflow_runs')
      .insert({
        workflow_id: workflowId,
        status: 'pending',
        trigger_type: originalRun.trigger_type,
        trigger_data: triggerData as unknown as import('@/lib/supabase/database.types').Json,
        steps_used: 0,
        ai_credits_used: 0,
        agent_id: originalRun.agent_id,
      })
      .select()
      .single()

    if (runError || !newRun) return { error: 'Failed to create retry run' }

    // Create run step records
    const runSteps = steps.map((step) => ({
      run_id: newRun.id,
      step_id: step.id,
      step_position: step.position,
      step_type: step.type,
      status: 'pending' as const,
      input: {},
      output: {},
    }))

    await supabase.from('workflow_run_steps').insert(runSteps)

    // Execute through visual executor
    const { executeVisualWorkflowSteps } = await import('@/lib/workflows/execute-visual-steps')
    await executeVisualWorkflowSteps({
      workflowId,
      runId: newRun.id,
      userId: user.id,
      triggerData,
      supabase,
    })

    // Update agent_workflows stats if agent-owned
    if (originalRun.agent_id) {
      const { data: agentLink } = await supabase
        .from('agent_workflows')
        .select('id, run_count')
        .eq('workflow_id', workflowId)
        .limit(1)
        .single()

      if (agentLink) {
        await supabase
          .from('agent_workflows')
          .update({
            last_run_at: new Date().toISOString(),
            run_count: (agentLink.run_count ?? 0) + 1,
          })
          .eq('id', agentLink.id)
      }
    }

    revalidatePath(`/agents`)
    return { success: true, new_run_id: newRun.id }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to retry workflow run',
    }
  }
}
