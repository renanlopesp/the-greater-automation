'use step'

import { sleep, FatalError } from 'workflow'
import type { HumanInLoopStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface HumanInLoopStepOutput {
  action_type: string
  status: string
  response: unknown
  responded_by?: string
  responded_at?: string
}

export async function humanInLoopStep(
  config: HumanInLoopStepConfig,
  runId: string,
  stepPosition: number
): Promise<HumanInLoopStepOutput> {
  const { action_type, prompt, timeout_minutes = 60 } = config

  if (!prompt) {
    throw new FatalError('Human-in-loop step requires a prompt')
  }

  // The actual approval creation and response handling is done by the HTTP executor
  // (execute route). This SDK step polls the human_approvals table for a response.
  // In production with Durable Workflows, the executor creates the approval record
  // before calling this step, then this step polls for the human response.

  try {
    const startTime = Date.now()
    const timeoutMs = timeout_minutes * 60 * 1000
    let waitTime = 5000
    const maxWaitTime = 60000

    while (Date.now() - startTime < timeoutMs) {
      // In the HTTP-based executor, the approval is created and the run pauses.
      // The approve API route handles the response and resumes execution.
      // This SDK polling path is for Durable Workflows only.

      // TODO: When Durable Workflows are wired up, query human_approvals here:
      // const supabase = await createServerClient()
      // const { data } = await supabase
      //   .from('human_approvals')
      //   .select('status, response, responded_by, responded_at')
      //   .eq('run_id', runId)
      //   .eq('step_position', stepPosition)
      //   .neq('status', 'pending')
      //   .single()
      //
      // if (data) {
      //   return {
      //     action_type,
      //     status: data.status,
      //     response: data.response,
      //     responded_by: data.responded_by,
      //     responded_at: data.responded_at,
      //   }
      // }

      await sleep(waitTime)
      waitTime = Math.min(waitTime * 1.5, maxWaitTime)
    }

    throw new FatalError(`Human response timeout after ${timeout_minutes} minutes`)
  } catch (error) {
    if (error instanceof FatalError) {
      throw error
    }
    if (error instanceof Error) {
      throw new FatalError(`Human-in-loop step failed: ${error.message}`)
    }
    throw new FatalError('Human-in-loop step failed')
  }
}
