'use step'

import { FatalError } from 'workflow'
import type { SequenceStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface SequenceStepOutput {
  inline_steps_count: number
  outputs: unknown[]
  aggregated_output: Record<string, unknown>
}

export async function sequenceStep(
  config: SequenceStepConfig,
  executeStepFn: (stepType: string, stepConfig: Record<string, unknown>) => Promise<unknown>
): Promise<SequenceStepOutput> {
  const { inline_steps } = config

  if (!inline_steps || inline_steps.length === 0) {
    throw new FatalError('Sequence step requires at least one inline step')
  }

  try {
    const outputs: unknown[] = []
    const aggregated: Record<string, unknown> = {}

    // Execute inline steps sequentially
    for (const step of inline_steps) {
      const output = await executeStepFn(step.type, step.config)
      outputs.push(output)

      // Store output with step ID as key
      aggregated[step.id] = output
    }

    return {
      inline_steps_count: inline_steps.length,
      outputs,
      aggregated_output: aggregated,
    }
  } catch (error) {
    if (error instanceof FatalError) {
      throw error
    }

    if (error instanceof Error) {
      throw new FatalError(`Sequence step failed: ${error.message}`)
    }

    throw new FatalError('Sequence step failed')
  }
}
