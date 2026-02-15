import { createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AgentWorkflowRow,
  WorkflowRun,
  WorkflowCondition,
  WorkflowActionConfig,
} from './types'
import type { Json } from '@/lib/supabase/database.types'
import { evaluateConditions } from './condition-engine'
import { executeActions } from './action-executor'

export interface ExecuteWorkflowOptions {
  workflow: AgentWorkflowRow
  triggerData: Record<string, unknown>
  userId: string
  supabaseClient?: SupabaseClient
}

/**
 * Execute a workflow: create run → evaluate conditions → execute actions → update run.
 */
export async function executeWorkflow(options: ExecuteWorkflowOptions): Promise<WorkflowRun> {
  const { workflow, triggerData, userId, supabaseClient } = options
  const supabase = supabaseClient ?? (await createServerClient())
  const startedAt = new Date()

  // 1. Create run record with status 'running'
  const { data: run, error: createError } = await supabase
    .from('agent_workflow_runs')
    .insert({
      workflow_id: workflow.id,
      agent_id: workflow.agent_id,
      status: 'running',
      trigger_data: triggerData as unknown as Json,
      started_at: startedAt.toISOString(),
    })
    .select()
    .single()

  if (createError || !run) {
    throw new Error(`Failed to create workflow run: ${createError?.message}`)
  }

  try {
    // 2. Evaluate conditions
    const conditions = workflow.conditions as unknown as WorkflowCondition[]
    const conditionEval = evaluateConditions(conditions, triggerData)

    // 3. If conditions fail, update run to 'skipped'
    if (!conditionEval.passed) {
      const { data: skippedRun } = await supabase
        .from('agent_workflow_runs')
        .update({
          status: 'skipped',
          condition_results: conditionEval.results as unknown as Json,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt.getTime(),
        })
        .eq('id', run.id)
        .select()
        .single()

      return skippedRun as unknown as WorkflowRun
    }

    // 4. If execution_mode is 'confirm', update to 'waiting_confirmation' and return
    if (workflow.execution_mode === 'confirm') {
      const { data: waitingRun } = await supabase
        .from('agent_workflow_runs')
        .update({
          status: 'waiting_confirmation',
          condition_results: conditionEval.results as unknown as Json,
        })
        .eq('id', run.id)
        .select()
        .single()

      return waitingRun as unknown as WorkflowRun
    }

    // 5. Execute actions sequentially
    const actions = workflow.actions as unknown as WorkflowActionConfig[]
    const actionResults = await executeActions(actions, triggerData, userId, supabase)

    // Check if any action failed
    const hasFailed = actionResults.some((r) => r.status === 'failed')
    const finalStatus = hasFailed ? 'failed' : 'completed'
    const errorMessage = hasFailed
      ? actionResults.find((r) => r.status === 'failed')?.error || 'Action execution failed'
      : null

    // 6. Update run to 'completed' or 'failed'
    const completedAt = new Date()
    const { data: completedRun } = await supabase
      .from('agent_workflow_runs')
      .update({
        status: finalStatus,
        condition_results: conditionEval.results as unknown as Json,
        actions_executed: actionResults as unknown as Json,
        error: errorMessage,
        completed_at: completedAt.toISOString(),
        duration_ms: completedAt.getTime() - startedAt.getTime(),
      })
      .eq('id', run.id)
      .select()
      .single()

    // 7. Update workflow's last_run_at and run_count
    await supabase
      .from('agent_workflows')
      .update({
        last_run_at: completedAt.toISOString(),
        run_count: workflow.run_count + 1,
      })
      .eq('id', workflow.id)

    // 8. Return the run record
    return completedRun as unknown as WorkflowRun
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    const { data: failedRun } = await supabase
      .from('agent_workflow_runs')
      .update({
        status: 'failed',
        error: errorMessage,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt.getTime(),
      })
      .eq('id', run.id)
      .select()
      .single()

    return failedRun as unknown as WorkflowRun
  }
}
