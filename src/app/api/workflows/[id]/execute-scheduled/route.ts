import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Database } from '@/lib/supabase/database.types'
import type { ScheduledTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'
import { executeAIStep } from '@/lib/ai/chat'
import { executeHTTPStep } from '@/lib/ai/http-executor'
import { executeFlowControlStep } from '@/lib/workflow-editor/flow-control-executor'
import { executeWebScrapingStep } from '@/lib/workflow-editor/web-scraping-executor'
import { executeUtilityStep } from '@/lib/workflow-editor/utility-executor'
import { executeSequenceStep } from '@/lib/workflow-editor/sequence-executor'
import type {
  AIStepConfig,
  HTTPStepConfig,
  FlowControlStepConfig,
  WebScrapingStepConfig,
  UtilityStepConfig,
  SequenceStepConfig,
} from '@/lib/workflow-editor/step-defaults'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/workflows/[id]/execute-scheduled
 *
 * Called by pg_cron + pg_net when a scheduled workflow is due.
 * Validates CRON_SECRET, checks time boundaries, then creates and executes a run.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: workflowId } = await params

  // Validate CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // Load workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, name, status')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    if (workflow.status !== 'published') {
      return NextResponse.json({ error: 'Workflow is not published' }, { status: 409 })
    }

    // Load trigger to check time boundaries (starts_at / ends_at)
    const { data: trigger } = await supabase
      .from('workflow_triggers')
      .select('config')
      .eq('workflow_id', workflowId)
      .eq('type', 'scheduled')
      .single()

    if (trigger?.config) {
      const config = trigger.config as unknown as ScheduledTriggerConfig
      const now = new Date()

      if (config.starts_at && now < new Date(config.starts_at)) {
        return NextResponse.json({ skipped: true, reason: 'Before starts_at' })
      }
      if (config.ends_at && now > new Date(config.ends_at)) {
        return NextResponse.json({ skipped: true, reason: 'After ends_at' })
      }
    }

    // Load steps
    const { data: steps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('id, position, type, name, config')
      .eq('workflow_id', workflowId)
      .order('position', { ascending: true })

    if (stepsError || !steps || steps.length === 0) {
      return NextResponse.json({ error: 'Workflow has no steps' }, { status: 400 })
    }

    // Create run
    const { data: run, error: runError } = await supabase
      .from('workflow_runs')
      .insert({
        workflow_id: workflowId,
        status: 'pending',
        trigger_type: 'scheduled',
        trigger_data: { source: 'pg_cron', triggered_at: new Date().toISOString() },
        steps_used: 0,
        ai_credits_used: 0,
      })
      .select('id')
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
    }

    // Create run steps
    const runSteps = steps.map((step) => ({
      run_id: run.id,
      step_id: step.id,
      step_position: step.position,
      step_type: step.type,
      status: 'pending' as const,
      input: {},
      output: {},
    }))

    const { error: runStepsError } = await supabase.from('workflow_run_steps').insert(runSteps)
    if (runStepsError) {
      return NextResponse.json({ error: 'Failed to initialize run steps' }, { status: 500 })
    }

    // Mark run as running
    await supabase
      .from('workflow_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', run.id)

    // Execute steps sequentially
    let totalAICreditsUsed = 0
    const stepOutputs: Record<string, unknown> = {}

    for (const step of steps) {
      const startTime = Date.now()

      await supabase
        .from('workflow_run_steps')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('run_id', run.id)
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
          case 'flow_control': {
            const result = await executeFlowControlStep(
              step.config as unknown as FlowControlStepConfig,
              stepOutputs
            )
            stepOutput = result as unknown as typeof stepOutput
            break
          }
          case 'web_scraping': {
            const result = await executeWebScrapingStep(
              step.config as unknown as WebScrapingStepConfig
            )
            if (result.success) {
              stepOutput = {
                content: result.content,
                metadata: (result.metadata ?? null) as Record<string, unknown> | null,
                links: (result.links ?? null) as Array<{ url: string; title?: string }> | null,
                url: result.url,
              } as unknown as typeof stepOutput
            } else {
              stepStatus = 'failed'
              stepError = result.error || 'Web scraping failed'
            }
            break
          }
          case 'human_in_loop': {
            stepOutput = {
              skipped: true,
              reason: 'Human-in-loop steps are not supported in scheduled runs',
            }
            break
          }
          case 'utility': {
            try {
              const result = executeUtilityStep(
                step.config as unknown as UtilityStepConfig,
                stepOutputs as Record<string, unknown>
              )
              stepOutput = result as unknown as typeof stepOutput
            } catch (err) {
              stepStatus = 'failed'
              stepError = err instanceof Error ? err.message : 'Utility step failed'
            }
            break
          }
          case 'sequence': {
            try {
              const seqConfig = step.config as unknown as SequenceStepConfig
              if (!seqConfig.workflow_id) {
                throw new Error('Sequence step requires a workflow_id')
              }
              if (seqConfig.workflow_id === workflowId) {
                throw new Error('A workflow cannot reference itself as a sub-workflow')
              }

              const { data: subSteps, error: subError } = await supabase
                .from('workflow_steps')
                .select('id, position, type, name, config')
                .eq('workflow_id', seqConfig.workflow_id)
                .order('position', { ascending: true })

              if (subError || !subSteps || subSteps.length === 0) {
                throw new Error(
                  `Sub-workflow "${seqConfig.workflow_name || seqConfig.workflow_id}" has no steps`
                )
              }

              const result = await executeSequenceStep(
                seqConfig.workflow_id,
                seqConfig.workflow_name || seqConfig.workflow_id,
                subSteps.map((s) => ({
                  ...s,
                  config: s.config as Record<string, unknown>,
                })),
                stepOutputs as Record<string, unknown>,
                async (type, cfg, ctx) => {
                  switch (type) {
                    case 'ai':
                      return executeAIStep(cfg as unknown as AIStepConfig)
                    case 'http':
                      return executeHTTPStep(cfg as unknown as HTTPStepConfig)
                    case 'flow_control':
                      return executeFlowControlStep(cfg as unknown as FlowControlStepConfig, ctx)
                    case 'utility':
                      return executeUtilityStep(cfg as unknown as UtilityStepConfig, ctx)
                    case 'web_scraping':
                      return executeWebScrapingStep(cfg as unknown as WebScrapingStepConfig)
                    case 'human_in_loop':
                      throw new Error('Human-in-loop steps are not supported in scheduled runs')
                    case 'sequence':
                      throw new Error('Nested sub-workflows are not supported')
                    default:
                      return { result: `Executed ${type} step` }
                  }
                }
              )
              stepOutput = result as unknown as typeof stepOutput
            } catch (err) {
              stepStatus = 'failed'
              stepError = err instanceof Error ? err.message : 'Sequence step failed'
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
        .eq('run_id', run.id)
        .eq('step_id', step.id)

      if (stepOutput) {
        stepOutputs[`step_${step.position + 1}`] = { output: stepOutput }
      }

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
          .eq('id', run.id)

        return NextResponse.json({
          success: false,
          runId: run.id,
          error: `Step "${step.name}" failed: ${stepError}`,
        })
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
      .eq('id', run.id)

    return NextResponse.json({ success: true, runId: run.id })
  } catch (error) {
    console.error('Error executing scheduled workflow:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
