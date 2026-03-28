import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

export async function fetchAgent(supabase: Client, agentId: string) {
  const { data } = await supabase
    .from('agents')
    .select(
      'id, name, team_id, system_prompt, model, temperature, max_tokens, is_orchestrator, palette, description, status, is_active, created_by, notification_settings, avatar_url, avatar_type, conversation_starters, snewclaw_instance_id, created_at, updated_at'
    )
    .eq('id', agentId)
    .single()
  return data
}

export async function fetchAgentWithSkills(supabase: Client, agentId: string) {
  const { data: agent } = await supabase
    .from('agents')
    .select(
      'id, name, team_id, system_prompt, model, temperature, max_tokens, is_orchestrator, palette, description, status, is_active, created_by, notification_settings, avatar_url, avatar_type, conversation_starters, snewclaw_instance_id, created_at, updated_at'
    )
    .eq('id', agentId)
    .single()

  if (!agent) return null

  const { data: workflows } = await supabase
    .from('agent_workflows')
    .select('id, name, workflow_id, last_run_at, run_count, workflows(id, name, emoji)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })

  return {
    ...agent,
    skills: (workflows ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      workflowId: w.workflow_id,
      lastRunAt: w.last_run_at,
      runCount: w.run_count,
      workflow: w.workflows as { id: string; name: string; emoji: string | null } | null,
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
