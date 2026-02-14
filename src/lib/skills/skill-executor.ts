import { createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentSkillRow, SkillRun, SkillCondition, SkillActionConfig } from './types'
import type { Json } from '@/lib/supabase/database.types'
import { evaluateConditions } from './condition-engine'
import { executeActions } from './action-executor'

export interface ExecuteSkillOptions {
  skill: AgentSkillRow
  triggerData: Record<string, unknown>
  userId: string
  supabaseClient?: SupabaseClient
}

/**
 * Execute a skill: create run → evaluate conditions → execute actions → update run.
 */
export async function executeSkill(options: ExecuteSkillOptions): Promise<SkillRun> {
  const { skill, triggerData, userId, supabaseClient } = options
  const supabase = supabaseClient ?? (await createServerClient())
  const startedAt = new Date()

  // 1. Create run record with status 'running'
  const { data: run, error: createError } = await supabase
    .from('agent_skill_runs')
    .insert({
      skill_id: skill.id,
      agent_id: skill.agent_id,
      status: 'running',
      trigger_data: triggerData as unknown as Json,
      started_at: startedAt.toISOString(),
    })
    .select()
    .single()

  if (createError || !run) {
    throw new Error(`Failed to create skill run: ${createError?.message}`)
  }

  try {
    // 2. Evaluate conditions
    const conditions = skill.conditions as unknown as SkillCondition[]
    const conditionEval = evaluateConditions(conditions, triggerData)

    // 3. If conditions fail, update run to 'skipped'
    if (!conditionEval.passed) {
      const { data: skippedRun } = await supabase
        .from('agent_skill_runs')
        .update({
          status: 'skipped',
          condition_results: conditionEval.results as unknown as Json,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt.getTime(),
        })
        .eq('id', run.id)
        .select()
        .single()

      return skippedRun as unknown as SkillRun
    }

    // 4. If execution_mode is 'confirm', update to 'waiting_confirmation' and return
    if (skill.execution_mode === 'confirm') {
      const { data: waitingRun } = await supabase
        .from('agent_skill_runs')
        .update({
          status: 'waiting_confirmation',
          condition_results: conditionEval.results as unknown as Json,
        })
        .eq('id', run.id)
        .select()
        .single()

      return waitingRun as unknown as SkillRun
    }

    // 5. Execute actions sequentially
    const actions = skill.actions as unknown as SkillActionConfig[]
    const actionResults = await executeActions(actions, triggerData, userId, supabase)

    // Check if any action failed
    const hasFailed = actionResults.some((r) => r.status === 'failed')
    const finalStatus = hasFailed ? 'failed' : 'completed'
    const errorMessage = hasFailed
      ? actionResults.find((r) => r.status === 'failed')?.error || 'Action execution failed'
      : null

    // 6. Update run to 'completed' or 'failed'
    const completedAt = new Date()
    const { data: completedRun } = await supabase
      .from('agent_skill_runs')
      .update({
        status: finalStatus,
        condition_results: conditionEval.results as unknown as Json,
        actions_executed: actionResults as unknown as Json,
        error: errorMessage,
        completed_at: completedAt.toISOString(),
        duration_ms: completedAt.getTime() - startedAt.getTime(),
      })
      .eq('id', run.id)
      .select()
      .single()

    // 7. Update skill's last_run_at and run_count
    await supabase
      .from('agent_skills')
      .update({
        last_run_at: completedAt.toISOString(),
        run_count: skill.run_count + 1,
      })
      .eq('id', skill.id)

    // 8. Return the run record
    return completedRun as unknown as SkillRun
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    const { data: failedRun } = await supabase
      .from('agent_skill_runs')
      .update({
        status: 'failed',
        error: errorMessage,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt.getTime(),
      })
      .eq('id', run.id)
      .select()
      .single()

    return failedRun as unknown as SkillRun
  }
}
