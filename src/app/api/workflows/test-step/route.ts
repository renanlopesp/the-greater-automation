import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { executeAIStep } from '@/lib/ai/chat'
import { executeHTTPStep } from '@/lib/ai/http-executor'
import type { AIStepConfig, HTTPStepConfig } from '@/lib/workflow-editor/step-defaults'
import type { StepType } from '@/lib/supabase/database.types'

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

  let body: { type: StepType; config: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { type, config } = body
  if (!type || !config) {
    return NextResponse.json({ error: 'Missing type or config' }, { status: 400 })
  }

  const startTime = Date.now()

  try {
    if (type === 'ai') {
      const result = await executeAIStep(config as unknown as AIStepConfig)
      const duration_ms = Date.now() - startTime
      return NextResponse.json({
        success: result.success,
        output: result.success ? result.content : null,
        error: result.error,
        duration_ms,
      })
    }

    if (type === 'http') {
      const result = await executeHTTPStep(config as unknown as HTTPStepConfig)
      const duration_ms = Date.now() - startTime
      return NextResponse.json({
        success: result.success,
        output: result.success
          ? { status: result.status, body: result.body, headers: result.headers }
          : null,
        error: result.error,
        duration_ms,
      })
    }

    // Simulated result for other step types
    const duration_ms = Date.now() - startTime
    return NextResponse.json({
      success: true,
      output: { message: `Simulated ${type} step execution`, type },
      error: undefined,
      duration_ms,
    })
  } catch (error) {
    const duration_ms = Date.now() - startTime
    return NextResponse.json({
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms,
    })
  }
}
