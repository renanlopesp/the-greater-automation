import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import { executeAIStep } from '@/lib/ai/chat'
import { executeHTTPStep } from '@/lib/ai/http-executor'
import type { AIStepConfig, HTTPStepConfig } from '@/lib/workflow-editor/step-defaults'

export async function POST(
  _request: Request,
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

    // Verify run exists and is in pending status
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .select('id, status, workflow_id')
      .eq('id', runId)
      .eq('workflow_id', workflowId)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    if (run.status !== 'pending') {
      return NextResponse.json({ error: `Run is already ${run.status}` }, { status: 409 })
    }

    // Load workflow steps
    const { data: steps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('id, position, type, name, config')
      .eq('workflow_id', workflowId)
      .order('position', { ascending: true })

    if (stepsError || !steps || steps.length === 0) {
      await supabase
        .from('workflow_runs')
        .update({
          status: 'failed',
          error: 'No steps configured',
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId)
      return NextResponse.json({ error: 'No steps configured' }, { status: 400 })
    }

    // Mark run as running
    await supabase
      .from('workflow_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', runId)

    // Execute steps sequentially
    let totalAICreditsUsed = 0

    for (const step of steps) {
      const startTime = Date.now()

      // Mark step running
      await supabase
        .from('workflow_run_steps')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('run_id', runId)
        .eq('step_id', step.id)

      let stepOutput: Database['public']['Tables']['workflow_run_steps']['Row']['output'] = null
      let stepError: string | null = null
      let stepStatus: 'completed' | 'failed' = 'completed'

      try {
        switch (step.type) {
          case 'ai': {
            const result = await executeAIStep(step.config as unknown as AIStepConfig)
            if (result.success) {
              stepOutput = {
                content: result.content,
                model: result.model ?? null,
                usage: result.usage
                  ? {
                      prompt_tokens: result.usage.prompt_tokens,
                      completion_tokens: result.usage.completion_tokens,
                      total_tokens: result.usage.total_tokens,
                    }
                  : null,
              }
              if (result.usage) {
                totalAICreditsUsed += result.usage.total_tokens
              }
            } else {
              stepStatus = 'failed'
              stepError = result.error || 'AI execution failed'
            }
            break
          }
          case 'http': {
            const result = await executeHTTPStep(step.config as unknown as HTTPStepConfig)
            if (result.success) {
              stepOutput = { status: result.status, body: result.body, headers: result.headers }
            } else {
              stepStatus = 'failed'
              stepError = result.error || 'HTTP request failed'
            }
            break
          }
          default:
            stepOutput = { result: `Step "${step.name}" executed (type: ${step.type})` }
        }
      } catch (err) {
        stepStatus = 'failed'
        stepError = err instanceof Error ? err.message : 'Unknown execution error'
      }

      const durationMs = Date.now() - startTime

      await supabase
        .from('workflow_run_steps')
        .update({
          status: stepStatus,
          output: stepOutput,
          error: stepError,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        })
        .eq('run_id', runId)
        .eq('step_id', step.id)

      // If step failed, mark the entire run as failed
      if (stepStatus === 'failed') {
        await supabase
          .from('workflow_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error: `Step "${step.name}" failed: ${stepError}`,
            steps_used: step.position,
            ai_credits_used: totalAICreditsUsed,
          })
          .eq('id', runId)
        return NextResponse.json({ success: false, error: stepError })
      }
    }

    // Mark run completed
    await supabase
      .from('workflow_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        steps_used: steps.length,
        ai_credits_used: totalAICreditsUsed,
      })
      .eq('id', runId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error executing workflow run:', error)

    // Attempt to mark run as failed (ignore errors here)
    try {
      await supabase
        .from('workflow_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Internal execution error',
        })
        .eq('id', runId)
    } catch {
      // best-effort
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
