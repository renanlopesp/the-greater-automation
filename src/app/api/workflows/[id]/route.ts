import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

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

    // Check if workflow has a scheduled trigger and remove the pg_cron job
    const { data: trigger } = await supabase
      .from('workflow_triggers')
      .select('type')
      .eq('workflow_id', workflowId)
      .single()

    if (trigger?.type === 'scheduled') {
      const serviceClient = createServiceClient()
      const jobName = `scheduled_wf_${workflowId}`
      // Remove pg_cron job — function handles "not found" gracefully
      await serviceClient.rpc('unschedule_cron_job', { job_name: jobName })
    }

    const { error: deleteError } = await supabase.from('workflows').delete().eq('id', workflowId)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting workflow:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
