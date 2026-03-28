import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { safeError } from '@/lib/safe-error'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { id: workflowId, runId } = await params
  const supabase = await createServerClient()

  try {
    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch workflow, run, and steps in parallel (all independent)
    const [
      { data: workflow, error: workflowError },
      { data: run, error: runError },
      { data: rawSteps, error: stepsError },
    ] = await Promise.all([
      supabase.from('workflows').select('id, team_id, name').eq('id', workflowId).single(),
      supabase
        .from('workflow_runs')
        .select(
          'id, workflow_id, status, trigger_type, trigger_data, steps_used, ai_credits_used, error, started_at, completed_at, created_at'
        )
        .eq('id', runId)
        .eq('workflow_id', workflowId)
        .single(),
      supabase
        .from('workflow_run_steps')
        .select(
          'id, run_id, step_id, step_position, step_type, status, input, output, error, started_at, completed_at, duration_ms'
        )
        .eq('run_id', runId)
        .order('step_position', { ascending: true }),
    ])

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    if (stepsError) {
      return NextResponse.json({ error: 'Failed to load run steps' }, { status: 500 })
    }

    // Fetch step names from workflow_steps (no FK, so separate query)
    const stepIds = (rawSteps ?? []).map((s) => s.step_id).filter(Boolean) as string[]
    const stepNames: Record<string, string> = {}
    if (stepIds.length > 0) {
      const { data: wsData } = await supabase
        .from('workflow_steps')
        .select('id, name')
        .in('id', stepIds)
      for (const ws of wsData ?? []) {
        stepNames[ws.id] = ws.name
      }
    }

    // Map step_name from the lookup
    const steps = (rawSteps ?? []).map((s) => ({
      ...s,
      step_name:
        (s.step_id && stepNames[s.step_id]) ||
        s.step_type?.toUpperCase() ||
        `Step ${s.step_position + 1}`,
    }))

    // Calculate summary statistics
    const totalSteps = steps?.length || 0
    const completedSteps = steps?.filter((s) => s.status === 'completed').length || 0
    const failedSteps = steps?.filter((s) => s.status === 'failed').length || 0
    const runningSteps = steps?.filter((s) => s.status === 'running').length || 0
    const pendingSteps = totalSteps - completedSteps - failedSteps - runningSteps

    // Calculate total duration
    let totalDurationMs = 0
    if (steps) {
      for (const step of steps) {
        if (step.duration_ms) {
          totalDurationMs += step.duration_ms
        }
      }
    }

    return NextResponse.json({
      run: {
        id: run.id,
        workflow_id: run.workflow_id,
        workflow_name: workflow.name,
        status: run.status,
        trigger_type: run.trigger_type,
        trigger_data: run.trigger_data,
        steps_used: run.steps_used,
        ai_credits_used: run.ai_credits_used,
        error: run.error,
        started_at: run.started_at,
        completed_at: run.completed_at,
        created_at: run.created_at,
      },
      steps: steps || [],
      summary: {
        total_steps: totalSteps,
        completed_steps: completedSteps,
        failed_steps: failedSteps,
        running_steps: runningSteps,
        pending_steps: pendingSteps,
        total_duration_ms: totalDurationMs,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('workflows/runs/[runId] GET', error, 'Failed to load workflow run') },
      { status: 500 }
    )
  }
}
