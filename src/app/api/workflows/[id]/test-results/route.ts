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

    // Parse pagination params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    // Verify workflow exists and user has access
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, team_id')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // App-level cleanup: delete expired rows before querying
    await supabase
      .from('step_test_results')
      .delete()
      .eq('workflow_id', workflowId)
      .lt('expires_at', new Date().toISOString())

    // Safety: mark stale running results (>2 min) as failed to prevent infinite polling
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    await supabase
      .from('step_test_results')
      .update({ status: 'failed' as const, error: 'Test execution timed out' })
      .eq('workflow_id', workflowId)
      .eq('status', 'running')
      .lt('created_at', twoMinutesAgo)

    // Get total count
    const { count, error: countError } = await supabase
      .from('step_test_results')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', workflowId)

    if (countError) {
      return NextResponse.json({ error: 'Failed to count test results' }, { status: 500 })
    }

    // Fetch test results
    const { data: results, error: resultsError } = await supabase
      .from('step_test_results')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (resultsError) {
      return NextResponse.json({ error: 'Failed to load test results' }, { status: 500 })
    }

    return NextResponse.json({
      results: results || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
    })
  } catch (error) {
    console.error('Error loading test results:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
