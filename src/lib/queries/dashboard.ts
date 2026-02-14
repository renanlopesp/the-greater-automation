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
  const { data: agents } = await supabase.from('agents').select('*').eq('team_id', teamId).limit(20)

  if (!agents || agents.length === 0) return []

  const agentIds = agents.map((a) => a.id)
  const { data: skills } = await supabase
    .from('agent_skills')
    .select('id, agent_id, name')
    .in('agent_id', agentIds)

  // Build Map for O(1) lookup instead of O(n) filter per agent
  const skillsByAgent = new Map<string, { id: string; agent_id: string; name: string }[]>()
  for (const skill of skills ?? []) {
    const list = skillsByAgent.get(skill.agent_id)
    if (list) {
      list.push(skill)
    } else {
      skillsByAgent.set(skill.agent_id, [skill])
    }
  }

  return agents.map((agent) => ({
    ...agent,
    skills: skillsByAgent.get(agent.id) ?? [],
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
      query = query.eq('status', 'draft').order('updated_at', { ascending: false })
      break
    case 'recently-edited':
      query = query.order('updated_at', { ascending: false })
      break
    case 'recently-run':
      query = query.neq('status', 'draft').order('updated_at', { ascending: false })
      break
    case 'starred':
      query = query.eq('is_starred', true).order('updated_at', { ascending: false })
      break
  }

  const { data } = await query
  return data ?? []
}

export async function fetchRunsToday(supabase: Client, teamId: string): Promise<number> {
  const now = new Date()
  const startOfDayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )

  const { data: workflows } = await supabase.from('workflows').select('id').eq('team_id', teamId)

  if (!workflows || workflows.length === 0) return 0

  const { count } = await supabase
    .from('workflow_runs')
    .select('id', { count: 'exact', head: true })
    .in(
      'workflow_id',
      workflows.map((w) => w.id)
    )
    .gte('started_at', startOfDayUTC.toISOString())

  return count ?? 0
}

export interface WorkflowRunStats {
  totalRuns: number
  lastRunAt: string | null
  sparklineData: { day: number; count: number }[]
}

export async function fetchWorkflowRunStats(
  supabase: Client,
  workflowIds: string[]
): Promise<Map<string, WorkflowRunStats>> {
  const stats = new Map<string, WorkflowRunStats>()
  if (workflowIds.length === 0) return stats

  // Initialize all workflows with empty stats
  for (const id of workflowIds) {
    stats.set(id, { totalRuns: 0, lastRunAt: null, sparklineData: [] })
  }

  // Fetch all runs for these workflows
  const { data: runs } = await supabase
    .from('workflow_runs')
    .select('workflow_id, started_at')
    .in('workflow_id', workflowIds)

  if (!runs || runs.length === 0) return stats

  // Build sparkline date range (last 14 days)
  const now = new Date()
  const sparklineDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (13 - i))
    return d.getDate()
  })

  // Aggregate per workflow
  const perWorkflow = new Map<
    string,
    { count: number; lastRun: string | null; dailyCounts: Record<number, number> }
  >()

  for (const run of runs) {
    const wId = run.workflow_id
    if (!perWorkflow.has(wId)) {
      perWorkflow.set(wId, { count: 0, lastRun: null, dailyCounts: {} })
    }
    const entry = perWorkflow.get(wId)!
    entry.count++
    if (run.started_at && (!entry.lastRun || run.started_at > entry.lastRun)) {
      entry.lastRun = run.started_at
    }
    if (run.started_at) {
      const day = new Date(run.started_at).getDate()
      entry.dailyCounts[day] = (entry.dailyCounts[day] ?? 0) + 1
    }
  }

  for (const [wId, entry] of perWorkflow) {
    stats.set(wId, {
      totalRuns: entry.count,
      lastRunAt: entry.lastRun,
      sparklineData: sparklineDays.map((day) => ({
        day,
        count: entry.dailyCounts[day] ?? 0,
      })),
    })
  }

  return stats
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
