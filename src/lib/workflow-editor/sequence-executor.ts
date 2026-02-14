import type { Database } from '@/lib/supabase/database.types'

type StepType = Database['public']['Enums']['step_type']

export interface SubWorkflowStep {
  id: string
  type: StepType
  name: string
  position: number
  config: Record<string, unknown>
}

export interface SequenceResult {
  workflow_id: string
  workflow_name: string
  steps_executed: number
  outputs: unknown[]
  aggregated_output: Record<string, unknown>
}

export type StepDispatchFn = (
  stepType: string,
  stepConfig: Record<string, unknown>,
  context: Record<string, unknown>
) => Promise<unknown>

/**
 * Execute a sub-workflow's steps sequentially using a dispatch function.
 * Steps are pre-loaded from the database; this function is pure orchestration.
 */
export async function executeSequenceStep(
  workflowId: string,
  workflowName: string,
  steps: SubWorkflowStep[],
  context: Record<string, unknown>,
  dispatchFn: StepDispatchFn
): Promise<SequenceResult> {
  if (!steps || steps.length === 0) {
    throw new Error('Sub-workflow has no steps to execute')
  }

  const outputs: unknown[] = []
  const aggregated: Record<string, unknown> = {}
  const localContext = { ...context }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    try {
      const output = await dispatchFn(step.type, step.config, localContext)
      outputs.push(output)
      aggregated[step.id] = output

      // Accumulate output for subsequent steps (same key pattern as main executor)
      localContext[`sub_step_${step.position + 1}`] = { output }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      throw new Error(
        `Sub-workflow "${workflowName}" failed at step "${step.name}" (${i + 1}/${steps.length}): ${message}`
      )
    }
  }

  return {
    workflow_id: workflowId,
    workflow_name: workflowName,
    steps_executed: steps.length,
    outputs,
    aggregated_output: aggregated,
  }
}
