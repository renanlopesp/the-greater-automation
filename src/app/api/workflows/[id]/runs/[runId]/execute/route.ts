import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { executeVisualWorkflowSteps } from '@/lib/workflows/execute-visual-steps'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const { id: workflowId, runId } = await params
  const supabase = await createServerClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await executeVisualWorkflowSteps({
    workflowId,
    runId,
    userId: user.id,
    supabase,
  })

  if (!result.success && !result.waiting) {
    const status =
      result.error === 'Run not found'
        ? 404
        : result.error?.startsWith('Run is already')
          ? 409
          : result.error === 'No steps configured'
            ? 400
            : 500
    return NextResponse.json({ success: false, error: result.error }, { status })
  }

  return NextResponse.json(result)
}
