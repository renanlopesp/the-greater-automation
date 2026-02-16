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
        'id, status, trigger_type, trigger_data, steps_used, ai_credits_used, started_at, completed_at, created_at, error'
      )
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (runsError) {
      return NextResponse.json({ error: 'Failed to load workflow runs' }, { status: 500 })
    }

    // Batch-fetch all step stats in a single query (avoids N+1)
    const runIds = (runs || []).map((r) => r.id)
    const { data: allStepStats } = runIds.length
      ? await supabase.from('workflow_run_steps').select('run_id, status').in('run_id', runIds)
      : { data: [] }

    const statsByRun = new Map<
      string,
      { total: number; completed: number; failed: number; running: number }
    >()
    for (const stat of allStepStats || []) {
      const entry = statsByRun.get(stat.run_id) ?? { total: 0, completed: 0, failed: 0, running: 0 }
      entry.total++
      if (stat.status === 'completed') entry.completed++
      else if (stat.status === 'failed') entry.failed++
      else if (stat.status === 'running') entry.running++
      statsByRun.set(stat.run_id, entry)
    }

    const runsWithProgress = (runs || []).map((run) => {
      const s = statsByRun.get(run.id) ?? { total: 0, completed: 0, failed: 0, running: 0 }
      return {
        ...run,
        progress: {
          total: s.total,
          completed: s.completed,
          failed: s.failed,
          running: s.running,
          pending: s.total - s.completed - s.failed - s.running,
        },
      }
    })

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
