import { NextResponse, after } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { safeDbError } from '@/lib/safe-error'
import { submitApprovalResponse } from '@/lib/workflow-editor/human-in-loop-executor'
import type { Json } from '@/lib/supabase/database.types'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/workflows/approve')

/**
 * GET: Fetch the pending approval for this run (if any)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { id: workflowId, runId } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: approval, error } = await supabase
    .from('human_approvals')
    .select(
      'id, action_type, prompt, context_data, expires_at, status, include_context, assignee_type, assignee'
    )
    .eq('run_id', runId)
    .eq('workflow_id', workflowId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: safeDbError('workflows/approve', error, 'Failed to load approval') },
      { status: 500 }
    )
  }

  return NextResponse.json({ approval: approval || null })
}

/**
 * POST: Submit an approval response and resume the workflow
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { id: workflowId, runId } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { approval_id, decision, comment, input_data } = body as {
    approval_id: string
    decision: 'approved' | 'rejected' | 'input_provided'
    comment?: string
    input_data?: unknown
  }

  if (!approval_id || !decision) {
    return NextResponse.json({ error: 'approval_id and decision are required' }, { status: 400 })
  }

  // Submit the response
  const result = await submitApprovalResponse(approval_id, user.id, decision, comment, input_data)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Find the step that was waiting and mark it completed/failed
  const { data: approval } = await supabase
    .from('human_approvals')
    .select('step_id, step_position, action_type')
    .eq('id', approval_id)
    .single()

  if (approval?.step_id) {
    const stepOutput = {
      action_type: approval.action_type,
      status: decision,
      response: { decision, comment: comment || null, input_data: (input_data || null) as Json },
      responded_by: user.id,
      responded_at: new Date().toISOString(),
    } as unknown as Json

    if (decision === 'rejected') {
      // Rejection: mark step as failed, mark run as failed
      await supabase
        .from('workflow_run_steps')
        .update({
          status: 'failed',
          output: stepOutput,
          error: comment || 'Approval rejected',
          completed_at: new Date().toISOString(),
          duration_ms: 0,
        })
        .eq('run_id', runId)
        .eq('step_id', approval.step_id)

      await supabase
        .from('workflow_runs')
        .update({
          status: 'failed',
          error: `Human approval rejected: ${comment || 'No reason provided'}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId)

      return NextResponse.json({ success: true, resumed: false })
    }

    // Approved or input_provided: mark step as completed
    await supabase
      .from('workflow_run_steps')
      .update({
        status: 'completed',
        output: stepOutput,
        completed_at: new Date().toISOString(),
        duration_ms: 0,
      })
      .eq('run_id', runId)
      .eq('step_id', approval.step_id)
  }

  // Resume workflow execution after response is sent (non-blocking)
  const baseUrl =
    request.headers.get('origin') || request.headers.get('referer')?.replace(/\/[^/]*$/, '') || ''
  const cookieHeader = request.headers.get('cookie') || ''

  after(async () => {
    if (!baseUrl) return
    try {
      await fetch(`${baseUrl}/api/workflows/${workflowId}/runs/${runId}/execute`, {
        method: 'POST',
        headers: { cookie: cookieHeader },
      })
    } catch (err) {
      log.error({ err }, 'Failed to resume workflow after approval')
    }
  })

  return NextResponse.json({ success: true, resumed: true })
}
