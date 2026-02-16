import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

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

    // Verify workflow exists
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, team_id, name')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Get the workflow run
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('id', runId)
      .eq('workflow_id', workflowId)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Get all step details for this run
    const { data: rawSteps, error: stepsError } = await supabase
      .from('workflow_run_steps')
      .select('*')
      .eq('run_id', runId)
      .order('step_position', { ascending: true })

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
    console.error('Error loading workflow run:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
