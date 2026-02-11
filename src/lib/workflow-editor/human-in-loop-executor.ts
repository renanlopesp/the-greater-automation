import { createServerClient } from '@/lib/supabase/server'
import type { HumanInLoopStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface HumanApprovalResponse {
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'input_provided' | 'timed_out'
  response: { decision?: string; comment?: string; input_data?: unknown } | null
  responded_by: string | null
  responded_at: string | null
}

export interface CreateApprovalResult {
  success: boolean
  approval_id?: string
  error?: string
}

export interface SubmitResponseResult {
  success: boolean
  approval?: HumanApprovalResponse
  error?: string
}

/**
 * Creates a human approval request in the database.
 * Called during workflow execution to pause and wait for human input.
 */
export async function createHumanApproval(
  config: HumanInLoopStepConfig,
  runId: string,
  stepId: string | null,
  stepPosition: number,
  workflowId: string,
  contextData: Record<string, unknown>
): Promise<CreateApprovalResult> {
  if (!config.prompt) {
    return { success: false, error: 'Prompt is required for human-in-loop step' }
  }

  const supabase = await createServerClient()
  const timeoutMinutes = config.timeout_minutes ?? 60
  const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('human_approvals')
    .insert({
      run_id: runId,
      step_id: stepId,
      step_position: stepPosition,
      workflow_id: workflowId,
      action_type: config.action_type,
      assignee_type: config.assignee_type,
      assignee: config.assignee || null,
      prompt: config.prompt,
      include_context: config.include_context,
      context_data: (config.include_context
        ? contextData
        : {}) as import('@/lib/supabase/database.types').Json,
      status: 'pending',
      timeout_minutes: timeoutMinutes,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to create approval request' }
  }

  return { success: true, approval_id: data.id }
}

/**
 * Submits a response to a pending human approval.
 * Called from the approve API route when a user responds.
 */
export async function submitApprovalResponse(
  approvalId: string,
  userId: string,
  decision: 'approved' | 'rejected' | 'input_provided',
  comment?: string,
  inputData?: unknown
): Promise<SubmitResponseResult> {
  const supabase = await createServerClient()

  // Fetch the current approval
  const { data: approval, error: fetchError } = await supabase
    .from('human_approvals')
    .select('id, status, expires_at')
    .eq('id', approvalId)
    .single()

  if (fetchError || !approval) {
    return { success: false, error: 'Approval not found' }
  }

  if (approval.status !== 'pending') {
    return { success: false, error: `Approval already ${approval.status}` }
  }

  // Check if expired
  if (new Date(approval.expires_at) < new Date()) {
    await supabase.from('human_approvals').update({ status: 'timed_out' }).eq('id', approvalId)
    return { success: false, error: 'Approval has timed out' }
  }

  const responsePayload: Record<string, unknown> = {
    decision,
    comment: comment || null,
    input_data: inputData || null,
  }

  const { data: updated, error: updateError } = await supabase
    .from('human_approvals')
    .update({
      status: decision,
      response: responsePayload as import('@/lib/supabase/database.types').Json,
      responded_by: userId,
      responded_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .select('id, status, response, responded_by, responded_at')
    .single()

  if (updateError || !updated) {
    return { success: false, error: updateError?.message || 'Failed to submit response' }
  }

  return {
    success: true,
    approval: {
      id: updated.id,
      status: updated.status as HumanApprovalResponse['status'],
      response: updated.response as HumanApprovalResponse['response'],
      responded_by: updated.responded_by,
      responded_at: updated.responded_at,
    },
  }
}

/**
 * Fetches the approval record for a specific step in a run.
 * Used during resume to check if an approval has been responded to.
 */
export async function getApprovalForStep(
  runId: string,
  stepPosition: number
): Promise<HumanApprovalResponse | null> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('human_approvals')
    .select('id, status, response, responded_by, responded_at')
    .eq('run_id', runId)
    .eq('step_position', stepPosition)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    status: data.status as HumanApprovalResponse['status'],
    response: data.response as HumanApprovalResponse['response'],
    responded_by: data.responded_by,
    responded_at: data.responded_at,
  }
}
