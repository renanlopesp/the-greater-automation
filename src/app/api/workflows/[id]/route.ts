import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { safeError } from '@/lib/safe-error'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: workflowId } = await params

  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this workflow (RLS will enforce this)
    const { data: workflow, error: accessError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .maybeSingle()

    if (accessError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Fetch trigger and runs in parallel (independent queries)
    const [{ data: trigger }, { data: runs }] = await Promise.all([
      supabase.from('workflow_triggers').select('type').eq('workflow_id', workflowId).maybeSingle(),
      supabase.from('workflow_runs').select('id').eq('workflow_id', workflowId),
    ])

    // Remove pg_cron job if scheduled
    if (trigger?.type === 'scheduled') {
      const serviceClient = createServiceClient()
      const jobName = `scheduled_wf_${workflowId}`
      await serviceClient.rpc('unschedule_cron_job', { job_name: jobName })
    }

    // Delete children explicitly BEFORE the parent to avoid RLS + CASCADE
    // conflict. Child table RLS policies join back to `workflows` for auth,
    // so CASCADE fails if the parent row is already gone. Deleting children
    // first while the parent still exists lets RLS checks pass normally.

    // 1. Delete grandchildren (workflow_run_steps + human_approvals)
    if (runs && runs.length > 0) {
      const runIds = runs.map((r) => r.id)
      await Promise.all([
        supabase.from('workflow_run_steps').delete().in('run_id', runIds),
        supabase.from('human_approvals').delete().in('run_id', runIds),
      ])
    }

    // 2. Delete direct children in parallel
    await Promise.all([
      supabase.from('step_test_results').delete().eq('workflow_id', workflowId),
      supabase.from('agent_workflows').delete().eq('workflow_id', workflowId),
      supabase.from('workflow_runs').delete().eq('workflow_id', workflowId),
      supabase.from('workflow_steps').delete().eq('workflow_id', workflowId),
      supabase.from('workflow_triggers').delete().eq('workflow_id', workflowId),
    ])

    // 3. Delete the workflow (no children left, CASCADE is a no-op)
    const { error: deleteError } = await supabase.from('workflows').delete().eq('id', workflowId)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('workflows/[id] DELETE', error, 'Failed to delete workflow') },
      { status: 500 }
    )
  }
}
