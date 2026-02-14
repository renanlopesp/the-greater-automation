import { createServerClient } from '@/lib/supabase/server'

export async function fetchSkillRuns(agentId: string, limit = 20) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('agent_skill_runs')
    .select(
      'id, skill_id, status, trigger_data, condition_results, actions_executed, error, started_at, completed_at, duration_ms, created_at, agent_skills(name)'
    )
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function fetchSkillRunDetail(runId: string) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('agent_skill_runs')
    .select('*, agent_skills(name, trigger_config, conditions, actions)')
    .eq('id', runId)
    .single()
  return data
}
