import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { executeWorkflow } from '@/lib/workflows/workflow-executor'
import type { AgentWorkflowRow } from '@/lib/workflows/types'
import { safeError } from '@/lib/safe-error'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workflowId } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load workflow (automation)
  const { data: workflow } = await supabase
    .from('agent_workflows')
    .select('*')
    .eq('id', workflowId)
    .single()
  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })

  // Parse optional trigger data from body
  let triggerData: Record<string, unknown> = {}
  try {
    const body = await request.json()
    triggerData = body.trigger_data || {}
  } catch {
    /* no body */
  }

  triggerData._manual = { executed_by: user.id, timestamp: new Date().toISOString() }

  try {
    const run = await executeWorkflow({
      workflow: workflow as unknown as AgentWorkflowRow,
      triggerData,
      userId: user.id,
    })

    return NextResponse.json({ success: true, run })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('agent-workflows/execute', error, 'Execution failed') },
      { status: 500 }
    )
  }
}
