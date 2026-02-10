'use step'

import { sleep, FatalError } from 'workflow'
import type { HumanInLoopStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface HumanInLoopStepOutput {
  action_type: string
  response: unknown
  responded_by?: string
  responded_at?: string
}

export async function humanInLoopStep(
  config: HumanInLoopStepConfig,
  runId: string,
  stepPosition: number
): Promise<HumanInLoopStepOutput> {
  const { action_type, assignee_type, assignee, prompt, timeout_minutes = 60 } = config

  if (!prompt) {
    throw new FatalError('Human-in-loop step requires a prompt')
  }

  // In production, you would create a pending approval/input record in the database
  // using createServerClient() and a human_approvals table

  try {
    const approvalData = {
      run_id: runId,
      step_position: stepPosition,
      action_type,
      assignee_type,
      assignee: assignee || null,
      prompt,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + timeout_minutes * 60 * 1000).toISOString(),
    }

    // TODO: Insert into human_approvals table when it exists
    // const { data: approval, error } = await supabase
    //   .from('human_approvals')
    //   .insert(approvalData)
    //   .select()
    //   .single()

    // For now, store in a temporary structure or use workflow_run_steps
    console.log('Human approval request created:', approvalData)

    // Poll for human response with exponential backoff
    const startTime = Date.now()
    const timeoutMs = timeout_minutes * 60 * 1000
    let waitTime = 5000 // Start with 5 seconds
    const maxWaitTime = 60000 // Max 60 seconds between checks

    while (Date.now() - startTime < timeoutMs) {
      // Check if human has responded
      // TODO: Query human_approvals table when it exists
      // const { data: updated } = await supabase
      //   .from('human_approvals')
      //   .select()
      //   .eq('run_id', runId)
      //   .eq('step_position', stepPosition)
      //   .single()

      // For now, simulate a timeout or implement a simple check
      // In production, this would check the database for the response

      // Sleep before next check (using workflow's sleep for suspendable execution)
      await sleep(waitTime)

      // Exponential backoff
      waitTime = Math.min(waitTime * 1.5, maxWaitTime)

      // In a real implementation, break here when response is found
      // if (updated && updated.status === 'responded') {
      //   return {
      //     action_type,
      //     response: updated.response,
      //     responded_by: updated.responded_by,
      //     responded_at: updated.responded_at,
      //   }
      // }
    }

    // Timeout reached
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
