import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { executeAIStep } from '@/lib/ai/chat'
import { executeHTTPStep } from '@/lib/ai/http-executor'
import { executeFlowControlStep } from '@/lib/workflow-editor/flow-control-executor'
import type {
  AIStepConfig,
  HTTPStepConfig,
  FlowControlStepConfig,
} from '@/lib/workflow-editor/step-defaults'
import type { Json } from '@/lib/supabase/database.types'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: testResultId } = await params
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

    // Load the test result record
    const { data: testResult, error: fetchError } = await supabase
      .from('step_test_results')
      .select('*')
      .eq('id', testResultId)
      .single()

    if (fetchError || !testResult) {
      return NextResponse.json({ error: 'Test result not found' }, { status: 404 })
    }

    if (testResult.status !== 'running') {
      return NextResponse.json({ error: `Test is already ${testResult.status}` }, { status: 409 })
    }

    const startTime = Date.now()
    let success: boolean
    let output: unknown
    let error: string | undefined

    const config = testResult.step_config as Record<string, unknown>

    if (testResult.step_type === 'ai') {
      const result = await executeAIStep(config as unknown as AIStepConfig)
      success = result.success
      output = result.success ? result.content : null
      error = result.error
    } else if (testResult.step_type === 'http') {
      const result = await executeHTTPStep(config as unknown as HTTPStepConfig)
      success = result.success
      output = result.success
        ? { status: result.status, body: result.body, headers: result.headers }
        : null
      error = result.error
    } else if (testResult.step_type === 'flow_control') {
      try {
        const result = await executeFlowControlStep(
          config as unknown as FlowControlStepConfig,
          {} // Empty context for isolated test
        )
        success = true
        output = result
        error = undefined
      } catch (err) {
        success = false
        output = null
        error = err instanceof Error ? err.message : 'Flow control execution failed'
      }
    } else {
      // Simulated result for other step types
      success = true
      output = {
        message: `Simulated ${testResult.step_type} step execution`,
        type: testResult.step_type,
      }
      error = undefined
    }

    const duration_ms = Date.now() - startTime

    // Update the test result record
    await supabase
      .from('step_test_results')
      .update({
        status: (success ? 'success' : 'failed') as 'success' | 'failed',
        output: (output ?? null) as Json,
        error: error || null,
        duration_ms,
      })
      .eq('id', testResultId)

    return NextResponse.json({ success, output, error, duration_ms })
  } catch (error) {
    const duration_ms = Date.now() - Date.now()
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Mark test as failed
    try {
      await supabase
        .from('step_test_results')
        .update({
          status: 'failed' as const,
          error: errorMessage,
          duration_ms,
        })
        .eq('id', testResultId)
    } catch {
      // best-effort
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
