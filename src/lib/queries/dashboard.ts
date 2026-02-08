import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

export async function fetchTeam(supabase: Client, teamId: string) {
  const { data } = await supabase
    .from('teams')
    .select('id, name, avatar_url')
    .eq('id', teamId)
    .single()
  return data
}

export async function fetchAgentsWithSkills(supabase: Client, teamId: string) {
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, description, avatar_url')
    .eq('team_id', teamId)
    .limit(20)

  if (!agents || agents.length === 0) return []

  const agentIds = agents.map((a) => a.id)
  const { data: skills } = await supabase
    .from('agent_skills')
    .select('id, agent_id, name')
    .in('agent_id', agentIds)

  return agents.map((agent) => ({
    ...agent,
    skills: (skills ?? []).filter((s) => s.agent_id === agent.id),
  }))
}

export type DashboardTab = 'needs-attention' | 'recently-edited' | 'recently-run' | 'starred'

export async function fetchWorkflows(supabase: Client, teamId: string, tab: DashboardTab) {
  let query = supabase
    .from('workflows')
    .select('id, name, emoji, status, is_starred, updated_at, created_at')
    .eq('team_id', teamId)
    .limit(20)

  switch (tab) {
    case 'needs-attention':
      query = query.order('updated_at', { ascending: false })
      break
    case 'recently-edited':
      query = query.order('updated_at', { ascending: false })
      break
    case 'recently-run':
      query = query.order('updated_at', { ascending: false })
      break
    case 'starred':
      query = query.eq('is_starred', true).order('updated_at', { ascending: false })
      break
  }

  const { data } = await query
  return data ?? []
}

export async function fetchWorkflowSparklineData(supabase: Client, workflowId: string) {
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data: runs } = await supabase
    .from('workflow_runs')
    .select('started_at')
    .eq('workflow_id', workflowId)
    .gte('started_at', fourteenDaysAgo.toISOString())

  if (!runs) return []

  const counts: Record<number, number> = {}
  for (const run of runs) {
    if (run.started_at) {
      const day = new Date(run.started_at).getDate()
      counts[day] = (counts[day] ?? 0) + 1
    }
  }

  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return { day: d.getDate(), count: counts[d.getDate()] ?? 0 }
  })
}
