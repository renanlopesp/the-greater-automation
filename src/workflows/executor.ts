'use workflow'

import { FatalError } from 'workflow'
import { createServerClient } from '@/lib/supabase/server'
import { StepOutputStore } from './utils/step-output-store'
import { resolveObjectVariables } from './utils/variable-resolver'
import { httpStep } from './steps/http-step'
import { aiStep } from './steps/ai-step'
import { webScrapingStep } from './steps/web-scraping-step'
import { appStep } from './steps/app-step'
import { humanInLoopStep } from './steps/human-in-loop-step'
import { utilityStep } from './steps/utility-step'
import { flowControlStep } from './steps/flow-control-step'
import { sequenceStep } from './steps/sequence-step'
import type { Database } from '@/lib/supabase/database.types'

type StepType = Database['public']['Enums']['step_type']

export interface WorkflowConfig {
  workflowId: string
  runId: string
  trigger: {
    type: string
    output: unknown
  }
  steps: Array<{
    id: string
    position: number
    type: StepType
    name: string
    config: Record<string, unknown>
  }>
}

export interface WorkflowExecutionResult {
  runId: string
  status: 'completed' | 'failed'
  outputs: Record<string, unknown>
  error?: string
}

export async function executeWorkflow(config: WorkflowConfig): Promise<WorkflowExecutionResult> {
  const { runId, trigger, steps } = config
  const outputStore = new StepOutputStore()
  const supabase = await createServerClient()

  try {
    // Set trigger output
    outputStore.setTriggerOutput(trigger.output)

    // Update run status to running
    await supabase
      .from('workflow_runs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', runId)

    // Execute steps sequentially
    for (const step of steps) {
      const stepStartTime = Date.now()

      try {
        // Get current context for variable resolution
        const context = outputStore.getContext()

        // Resolve variables in step config
        const resolvedConfig = resolveObjectVariables(step.config, context)

        // Update step status to running
        await supabase
          .from('workflow_run_steps')
          .update({
            status: 'running',
            started_at: new Date().toISOString(),
            input: resolvedConfig as never,
          })
          .eq('run_id', runId)
          .eq('step_position', step.position)

        // Execute the step based on type
        const output = await executeStep(step.type, resolvedConfig, runId, step.position, context)

        // Store the output
        outputStore.setOutput(step.position, output)

        // Calculate duration
        const durationMs = Date.now() - stepStartTime

        // Update step status to completed
        await supabase
          .from('workflow_run_steps')
          .update({
            status: 'completed',
            output: output as never,
            completed_at: new Date().toISOString(),
            duration_ms: durationMs,
          })
          .eq('run_id', runId)
          .eq('step_position', step.position)
      } catch (error) {
        // Calculate duration
        const durationMs = Date.now() - stepStartTime

        // Update step status to failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await supabase
          .from('workflow_run_steps')
          .update({
            status: 'failed',
            error: errorMessage,
            completed_at: new Date().toISOString(),
            duration_ms: durationMs,
          })
          .eq('run_id', runId)
          .eq('step_position', step.position)

        // If it's a FatalError, fail the entire workflow
        if (error instanceof FatalError) {
          throw error
        }

        // Otherwise, rethrow for retry
        throw error
      }
    }

    // All steps completed successfully
    await supabase
      .from('workflow_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        steps_used: steps.length,
      })
      .eq('id', runId)

    return {
      runId,
      status: 'completed',
      outputs: outputStore.getContext(),
    }
  } catch (error) {
    // Workflow failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await supabase
      .from('workflow_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: errorMessage,
      })
      .eq('id', runId)

    return {
      runId,
      status: 'failed',
      outputs: outputStore.getContext(),
      error: errorMessage,
    }
  } finally {
    // Cleanup
    outputStore.clear()
  }
}

// Execute a single step based on its type
async function executeStep(
  stepType: StepType,
  config: Record<string, unknown>,
  runId: string,
  stepPosition: number,
  context: Record<string, unknown>
): Promise<unknown> {
  switch (stepType) {
    case 'http':
      return httpStep(config as never)

    case 'ai':
      return aiStep(config as never)

    case 'web_scraping':
      return webScrapingStep(config as never)

    case 'app':
      return appStep(config as never)

    case 'human_in_loop':
      return humanInLoopStep(config as never, runId, stepPosition)

    case 'utility':
      return utilityStep(config as never)

    case 'flow_control':
      // Flow control needs context for condition evaluation
      return flowControlStep(config as never, context)

    case 'sequence':
      // Sequence needs to load sub-workflow steps, then execute each
      return sequenceStep(
        config as never,
        async (_workflowId: string) => {
          // In SDK context, sub-workflow step loading is handled by the runtime
          throw new FatalError('Sub-workflow loading not available in SDK executor')
        },
        async (type: string, stepConfig: Record<string, unknown>) => {
          return executeStep(type as StepType, stepConfig, runId, stepPosition, context)
        }
      )

    default:
      throw new FatalError(`Unknown step type: ${stepType}`)
  }
}
