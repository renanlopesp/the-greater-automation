import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

export async function fetchAgent(supabase: Client, agentId: string) {
  const { data } = await supabase.from('agents').select('*').eq('id', agentId).single()
  return data
}

export async function fetchAgentWithSkills(supabase: Client, agentId: string) {
  const { data: agent } = await supabase.from('agents').select('*').eq('id', agentId).single()

  if (!agent) return null

  const { data: skills } = await supabase
    .from('agent_skills')
    .select('id, name, workflow_id, last_run_at, run_count, workflows(id, name, emoji)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })

  return {
    ...agent,
    skills: (skills ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      workflowId: s.workflow_id,
      lastRunAt: s.last_run_at,
      runCount: s.run_count,
      workflow: s.workflows as { id: string; name: string; emoji: string | null } | null,
    })),
  }
}

export async function fetchTeamWorkflows(supabase: Client, teamId: string) {
  const { data } = await supabase
    .from('workflows')
    .select('id, name, emoji, status')
    .eq('team_id', teamId)
    .order('name')
  return data ?? []
}
