import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { executeWorkflow } from '@/lib/workflows/workflow-executor'
import type { AgentWorkflowRow } from '@/lib/workflows/types'

export async function POST(request: NextRequest) {
  // Verify cron secret (optional)
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Find all enabled scheduled workflows (automations)
  const { data: workflows } = await supabase
    .from('agent_workflows')
    .select('*, agents(created_by)')
    .eq('is_enabled', true)
    .eq('source', 'rule')
    .filter('trigger_config->>type', 'eq', 'scheduled')

  if (!workflows || workflows.length === 0) {
    return NextResponse.json({ executed: 0 })
  }

  // Execute all workflows in parallel
  const timestamp = new Date().toISOString()
  const settled = await Promise.allSettled(
    workflows
      .filter((w) => (w.agents as { created_by: string } | null) !== null)
      .map(async (workflow) => {
        const agent = workflow.agents as { created_by: string }
        const run = await executeWorkflow({
          workflow: workflow as unknown as AgentWorkflowRow,
          triggerData: { _cron: { timestamp } },
          userId: agent.created_by,
          supabaseClient: supabase,
        })
        return { workflow_id: workflow.id, run_id: run.id, status: run.status }
      })
  )

  const results = settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          workflow_id: workflows[i].id,
          error: r.reason instanceof Error ? r.reason.message : 'Failed',
        }
  )

  return NextResponse.json({ executed: results.length, results })
}
