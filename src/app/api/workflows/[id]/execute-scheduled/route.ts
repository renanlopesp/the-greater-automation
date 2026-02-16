import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { ScheduledTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'
import { executeWorkflowSteps } from '@/lib/workflow-editor/webhook-executor'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/workflows/[id]/execute-scheduled
 *
 * Called by pg_cron + pg_net when a scheduled workflow is due.
 * Validates CRON_SECRET, checks time boundaries, then creates and executes a run.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: workflowId } = await params

  // Validate CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Load workflow, trigger, and steps in parallel (all independent)
    const [
      { data: workflow, error: workflowError },
      { data: trigger },
      { data: steps, error: stepsError },
    ] = await Promise.all([
      supabase.from('workflows').select('id, name, status').eq('id', workflowId).single(),
      supabase
        .from('workflow_triggers')
        .select('config')
        .eq('workflow_id', workflowId)
        .eq('type', 'scheduled')
        .single(),
      supabase
        .from('workflow_steps')
        .select('id, position, type, name, config')
        .eq('workflow_id', workflowId)
        .order('position', { ascending: true }),
    ])

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    if (workflow.status !== 'published') {
      return NextResponse.json({ error: 'Workflow is not published' }, { status: 409 })
    }

    if (trigger?.config) {
      const config = trigger.config as unknown as ScheduledTriggerConfig
      const now = new Date()

      if (config.starts_at && now < new Date(config.starts_at)) {
        return NextResponse.json({ skipped: true, reason: 'Before starts_at' })
      }
      if (config.ends_at && now > new Date(config.ends_at)) {
        return NextResponse.json({ skipped: true, reason: 'After ends_at' })
      }
    }

    if (stepsError || !steps || steps.length === 0) {
      return NextResponse.json({ error: 'Workflow has no steps' }, { status: 400 })
    }

    // Create run
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .insert({
        workflow_id: workflowId,
        status: 'pending',
        trigger_type: 'scheduled',
        trigger_data: { source: 'pg_cron', triggered_at: new Date().toISOString() },
        steps_used: 0,
        ai_credits_used: 0,
      })
      .select('id')
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
    }

    // Create run steps
    const runSteps = steps.map((step) => ({
      run_id: run.id,
      step_id: step.id,
      step_position: step.position,
      step_type: step.type,
      status: 'pending' as const,
      input: {},
      output: {},
    }))

    const { error: runStepsError } = await supabase.from('workflow_run_steps').insert(runSteps)
    if (runStepsError) {
      return NextResponse.json({ error: 'Failed to initialize run steps' }, { status: 500 })
    }

    // Mark run as running
    await supabase
      .from('workflow_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', run.id)

    // Execute steps using shared executor
    const result = await executeWorkflowSteps(
      supabase,
      run.id,
      workflowId,
      steps.map((s) => ({ ...s, config: s.config as Record<string, unknown> | null }))
    )

    if (!result.success) {
      return NextResponse.json({
        success: false,
        runId: run.id,
        error: result.error,
      })
    }

    return NextResponse.json({ success: true, runId: run.id })
  } catch (error) {
    console.error('Error executing scheduled workflow:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
