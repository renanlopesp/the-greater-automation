import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workflowId } = await params
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

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 })
    }

    if (offset < 0) {
      return NextResponse.json({ error: 'Offset must be non-negative' }, { status: 400 })
    }

    // Verify workflow exists and user has access
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, team_id')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Get total count of runs
    const { count, error: countError } = await supabase
      .from('workflow_runs')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', workflowId)

    if (countError) {
      return NextResponse.json({ error: 'Failed to count runs' }, { status: 500 })
    }

    // Get workflow runs with pagination
    const { data: runs, error: runsError } = await supabase
      .from('workflow_runs')
      .select(
        'id, status, trigger_type, steps_used, ai_credits_used, started_at, completed_at, created_at, error'
      )
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (runsError) {
      return NextResponse.json({ error: 'Failed to load workflow runs' }, { status: 500 })
    }

    // For each run, get the step progress
    const runsWithProgress = await Promise.all(
      (runs || []).map(async (run) => {
        const { data: stepStats } = await supabase
          .from('workflow_run_steps')
          .select('status')
          .eq('run_id', run.id)

        const totalSteps = stepStats?.length || 0
        const completedSteps = stepStats?.filter((s) => s.status === 'completed').length || 0
        const failedSteps = stepStats?.filter((s) => s.status === 'failed').length || 0
        const runningSteps = stepStats?.filter((s) => s.status === 'running').length || 0

        return {
          ...run,
          progress: {
            total: totalSteps,
            completed: completedSteps,
            failed: failedSteps,
            running: runningSteps,
            pending: totalSteps - completedSteps - failedSteps - runningSteps,
          },
        }
      })
    )

    return NextResponse.json({
      runs: runsWithProgress,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
    })
  } catch (error) {
    console.error('Error loading workflow runs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
