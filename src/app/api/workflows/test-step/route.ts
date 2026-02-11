import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { StepType, Json } from '@/lib/supabase/database.types'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    type: StepType
    config: Record<string, unknown>
    workflowId: string
    stepId?: string
    stepName: string
    stepPosition: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { type, config, workflowId, stepId, stepName, stepPosition } = body
  if (!type || !config || !workflowId) {
    return NextResponse.json({ error: 'Missing type, config, or workflowId' }, { status: 400 })
  }

  // Create test result record with 'running' status (fast)
  const { data: inserted, error: insertError } = await supabase
    .from('step_test_results')
    .insert({
      workflow_id: workflowId,
      step_id: stepId || null,
      step_position: stepPosition ?? 0,
      step_type: type,
      step_name: stepName || 'Unnamed step',
      step_config: config as unknown as Json,
      status: 'running' as const,
      output: null,
      error: null,
      duration_ms: 0,
      tested_by: user.id,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return NextResponse.json({ error: 'Failed to create test record' }, { status: 500 })
  }

  return NextResponse.json({
    test_result_id: inserted.id,
  })
}
