import { createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AgentWorkflowRow,
  WorkflowRun,
  WorkflowCondition,
  WorkflowActionConfig,
  PipelineStepRecord,
} from './types'
import type { Json } from '@/lib/supabase/database.types'
import { evaluateConditions } from './condition-engine'
import { executeActions } from './action-executor'

export interface ExecutePipelineOptions {
  workflow: AgentWorkflowRow
  triggerData: Record<string, unknown>
  userId: string
  eventLogId?: string
  supabaseClient?: SupabaseClient
}

/**
 * Execute a multi-step workflow pipeline with per-step status tracking.
 * Updates pipeline_steps JSONB after each step for real-time visibility.
 */
export async function executePipeline(options: ExecutePipelineOptions): Promise<WorkflowRun> {
  const { workflow, triggerData, userId, eventLogId, supabaseClient } = options
  const supabase = supabaseClient ?? (await createServerClient())
  const startedAt = new Date()

  // Initialize pipeline steps from workflow actions
  const actions = workflow.actions as unknown as WorkflowActionConfig[]
  const pipelineSteps: PipelineStepRecord[] = actions.map((action, index) => ({
    step_index: index,
    action_type: action.type,
    action_config: action,
    status: 'pending' as const,
  }))

  // 1. Create run record
  const { data: run, error: createError } = await supabase
    .from('agent_workflow_runs')
    .insert({
      workflow_id: workflow.id,
      agent_id: workflow.agent_id,
      status: 'running',
      trigger_data: triggerData as unknown as Json,
      started_at: startedAt.toISOString(),
      pipeline_steps: pipelineSteps as unknown as Json,
      current_step_index: 0,
      ...(eventLogId ? { event_log_id: eventLogId } : {}),
    })
    .select()
    .single()

  if (createError || !run) {
    throw new Error(`Failed to create pipeline run: ${createError?.message}`)
  }

  try {
    // 2. Evaluate conditions
    const conditions = workflow.conditions as unknown as WorkflowCondition[]
    const conditionEval = evaluateConditions(conditions, triggerData)

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

    // 3. Execute actions sequentially with per-step tracking
    const previousOutputs: Record<string, unknown> = {}

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      const stepStart = new Date()

      // Mark step as running
      pipelineSteps[i].status = 'running'
      pipelineSteps[i].started_at = stepStart.toISOString()

      await supabase
        .from('agent_workflow_runs')
        .update({
          pipeline_steps: pipelineSteps as unknown as Json,
          current_step_index: i,
        })
        .eq('id', run.id)

      // Execute single action
      const [result] = await executeActions([action], triggerData, userId, supabase)

      // Merge outputs for next step
      if (result.status === 'success' && result.output) {
        Object.assign(previousOutputs, result.output)
        // Update triggerData with previous outputs so templates resolve
        Object.assign(triggerData, { prev: previousOutputs })
      }

      // Update step record
      const stepEnd = new Date()
      pipelineSteps[i].completed_at = stepEnd.toISOString()
      pipelineSteps[i].duration_ms = stepEnd.getTime() - stepStart.getTime()

      if (result.status === 'failed') {
        pipelineSteps[i].status = 'failed'
        pipelineSteps[i].error = result.error
        pipelineSteps[i].output = result.output

        // Mark remaining steps as skipped
        for (let j = i + 1; j < pipelineSteps.length; j++) {
          pipelineSteps[j].status = 'skipped'
        }

        // Update run as failed
        const { data: failedRun } = await supabase
          .from('agent_workflow_runs')
          .update({
            status: 'failed',
            condition_results: conditionEval.results as unknown as Json,
            pipeline_steps: pipelineSteps as unknown as Json,
            actions_executed: [result] as unknown as Json,
            error: result.error || `Step ${i} failed`,
            completed_at: stepEnd.toISOString(),
            duration_ms: stepEnd.getTime() - startedAt.getTime(),
          })
          .eq('id', run.id)
          .select()
          .single()

        // Update workflow stats
        await supabase
          .from('agent_workflows')
          .update({
            last_run_at: stepEnd.toISOString(),
            run_count: workflow.run_count + 1,
          })
          .eq('id', workflow.id)

        return failedRun as unknown as WorkflowRun
      }

      // Step succeeded
      pipelineSteps[i].status = 'completed'
      pipelineSteps[i].output = result.output

      // Persist step progress to DB (real-time visibility)
      await supabase
        .from('agent_workflow_runs')
        .update({
          pipeline_steps: pipelineSteps as unknown as Json,
          current_step_index: i + 1,
        })
        .eq('id', run.id)
    }

    // 4. All steps completed
    const completedAt = new Date()
    const { data: completedRun } = await supabase
      .from('agent_workflow_runs')
      .update({
        status: 'completed',
        condition_results: conditionEval.results as unknown as Json,
        pipeline_steps: pipelineSteps as unknown as Json,
        completed_at: completedAt.toISOString(),
        duration_ms: completedAt.getTime() - startedAt.getTime(),
      })
      .eq('id', run.id)
      .select()
      .single()

    // Update workflow stats
    await supabase
      .from('agent_workflows')
      .update({
        last_run_at: completedAt.toISOString(),
        run_count: workflow.run_count + 1,
      })
      .eq('id', workflow.id)

    return completedRun as unknown as WorkflowRun
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    const { data: failedRun } = await supabase
      .from('agent_workflow_runs')
      .update({
        status: 'failed',
        pipeline_steps: pipelineSteps as unknown as Json,
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
