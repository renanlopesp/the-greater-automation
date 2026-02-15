import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { executeAIStep } from '@/lib/ai/chat'
import { executeHTTPStep } from '@/lib/ai/http-executor'
import { executeFlowControlStep } from '@/lib/workflow-editor/flow-control-executor'
import { executeWebScrapingStep } from '@/lib/workflow-editor/web-scraping-executor'
import { executeUtilityStep } from '@/lib/workflow-editor/utility-executor'
import { executeSequenceStep } from '@/lib/workflow-editor/sequence-executor'
import { getComposio } from '@/lib/composio/client'
import type {
  AIStepConfig,
  HTTPStepConfig,
  AppStepConfig,
  FlowControlStepConfig,
  WebScrapingStepConfig,
  UtilityStepConfig,
  SequenceStepConfig,
} from '@/lib/workflow-editor/step-defaults'
import type { Json } from '@/lib/supabase/database.types'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: testResultId } = await params
  const supabase = await createServerClient()

  const startTime = Date.now()

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
    } else if (testResult.step_type === 'human_in_loop') {
      const hilConfig =
        config as unknown as import('@/lib/workflow-editor/step-defaults').HumanInLoopStepConfig
      success = !!hilConfig.prompt
      output = success
        ? {
            action_type: hilConfig.action_type,
            status: 'approved',
            response: { decision: 'approved', comment: 'Test mode — auto-approved' },
            responded_by: 'test-user',
            responded_at: new Date().toISOString(),
          }
        : null
      error = success ? undefined : 'Prompt is required'
    } else if (testResult.step_type === 'web_scraping') {
      const result = await executeWebScrapingStep(config as unknown as WebScrapingStepConfig)
      success = result.success
      output = result.success
        ? { content: result.content, metadata: result.metadata, links: result.links }
        : null
      error = result.error
    } else if (testResult.step_type === 'utility') {
      try {
        const result = executeUtilityStep(
          config as unknown as UtilityStepConfig,
          {} // Empty context for isolated test
        )
        success = true
        output = result
        error = undefined
      } catch (err) {
        success = false
        output = null
        error = err instanceof Error ? err.message : 'Utility step execution failed'
      }
    } else if (testResult.step_type === 'sequence') {
      try {
        const seqConfig = config as unknown as SequenceStepConfig

        if (!seqConfig.workflow_id) {
          throw new Error('Sequence step requires a workflow_id')
        }

        // Load sub-workflow steps
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
          {},
          async (type, cfg, ctx) => {
            if (type === 'utility')
              return executeUtilityStep(cfg as unknown as UtilityStepConfig, ctx)
            if (type === 'flow_control')
              return executeFlowControlStep(cfg as unknown as FlowControlStepConfig, ctx)
            if (type === 'human_in_loop')
              throw new Error('Human-in-loop steps are not supported inside sub-workflows')
            if (type === 'sequence') throw new Error('Nested sub-workflows are not supported')
            // Simulate I/O steps in test mode
            return { message: `Simulated ${type} step`, type }
          }
        )
        success = true
        output = result
      } catch (err) {
        success = false
        output = null
        error = err instanceof Error ? err.message : 'Sequence execution failed'
      }
    } else if (testResult.step_type === 'app') {
      const appConfig = config as unknown as AppStepConfig
      if (!appConfig.app_id || !appConfig.action) {
        success = false
        output = null
        error = 'App step requires app_id and action'
      } else {
        // Look up the user's Composio connection for this app
        const { data: connection } = await supabase
          .from('app_connections')
          .select('composio_connection_id')
          .eq('user_id', user.id)
          .eq('app_id', appConfig.app_id)
          .single()

        if (!connection?.composio_connection_id) {
          success = false
          output = null
          error = `No ${appConfig.app_id} connection found. Connect the app in Settings.`
        } else {
          try {
            const composio = getComposio()
            const result = await composio.tools.execute(appConfig.action, {
              connectedAccountId: connection.composio_connection_id,
              arguments: appConfig.inputs ?? {},
            })

            const appResult = result as {
              successful?: boolean
              data?: unknown
              error?: string
            }

            if (appResult.successful) {
              success = true
              output = appResult.data
            } else {
              success = false
              output = null
              error = appResult.error || `${appConfig.app_id} ${appConfig.action} failed`
            }
          } catch (err) {
            success = false
            output = null
            error = err instanceof Error ? err.message : 'App action execution failed'
          }
        }
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
    const duration_ms = Date.now() - startTime
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
