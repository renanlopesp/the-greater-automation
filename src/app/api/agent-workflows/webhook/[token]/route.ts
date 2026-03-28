import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { executeWorkflow } from '@/lib/workflows/workflow-executor'
import type { AgentWorkflowRow } from '@/lib/workflows/types'

/**
 * Verify HMAC-SHA256 webhook signature.
 * Supports X-Webhook-Signature-256 (generic) and X-Hub-Signature-256 (GitHub).
 */
function verifySignature(rawBody: string, secret: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
  } catch {
    return false
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Use service role since webhooks are unauthenticated
  const supabase = createServiceClient()

  // Look up workflow (automation) by webhook token in trigger_config
  const { data: workflow } = await supabase
    .from('agent_workflows')
    .select('*, agents(created_by)')
    .eq('is_enabled', true)
    .eq('source', 'rule')
    .filter('trigger_config->>webhook_token', 'eq', token)
    .single()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  // Read raw body for signature verification
  const rawBody = await request.text()

  // Verify webhook signature if secret is configured
  const triggerConfig = workflow.trigger_config as { webhook_secret?: string } | null
  const webhookSecret = triggerConfig?.webhook_secret
  if (webhookSecret) {
    const signature =
      request.headers.get('x-webhook-signature-256') || request.headers.get('x-hub-signature-256')
    if (!verifySignature(rawBody, webhookSecret, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }
  }

  // Parse request body as trigger data
  let triggerData: Record<string, unknown> = {}
  try {
    triggerData = JSON.parse(rawBody)
  } catch {
    triggerData = { body: rawBody }
  }

  // Add metadata to trigger data
  triggerData._webhook = {
    token,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString(),
  }

  // Get the agent to find the creator
  const agent = workflow.agents as { created_by: string } | null
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  try {
    const run = await executeWorkflow({
      workflow: workflow as unknown as AgentWorkflowRow,
      triggerData,
      userId: agent.created_by,
      supabaseClient: supabase,
    })
    return NextResponse.json({ success: true, run_id: run.id, status: run.status })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 }
    )
  }
}

// Also handle GET for webhook verification
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  await params
  return NextResponse.json({ status: 'ok' })
}
