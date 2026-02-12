'use step'

import { FatalError } from 'workflow'
import type { SequenceStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface SequenceStepOutput {
  workflow_id: string
  workflow_name: string
  steps_executed: number
  outputs: unknown[]
  aggregated_output: Record<string, unknown>
}

export async function sequenceStep(
  config: SequenceStepConfig,
  loadSubWorkflowSteps: (
    workflowId: string
  ) => Promise<Array<{ id: string; type: string; name: string; config: Record<string, unknown> }>>,
  executeStepFn: (stepType: string, stepConfig: Record<string, unknown>) => Promise<unknown>
): Promise<SequenceStepOutput> {
  const { workflow_id, workflow_name } = config

  if (!workflow_id) {
    throw new FatalError('Sequence step requires a workflow_id')
  }

  try {
    const steps = await loadSubWorkflowSteps(workflow_id)

    if (!steps || steps.length === 0) {
      throw new FatalError(`Sub-workflow "${workflow_name || workflow_id}" has no steps`)
    }

    const outputs: unknown[] = []
    const aggregated: Record<string, unknown> = {}

    for (const step of steps) {
      const output = await executeStepFn(step.type, step.config)
      outputs.push(output)
      aggregated[step.id] = output
    }

    return {
      workflow_id,
      workflow_name: workflow_name || workflow_id,
      steps_executed: steps.length,
      outputs,
      aggregated_output: aggregated,
    }
  } catch (error) {
    if (error instanceof FatalError) {
      throw error
    }

    if (error instanceof Error) {
      throw new FatalError(
        `Sub-workflow "${workflow_name || workflow_id}" failed: ${error.message}`
      )
    }

    throw new FatalError('Sequence step failed')
  }
}
