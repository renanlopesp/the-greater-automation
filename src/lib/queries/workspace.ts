import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

export interface WorkspaceWorkflow {
  type: 'workflow'
  id: string
  name: string
  emoji: string | null
  status: string
  created_by: string
  updated_at: string | null
  created_at: string
  published_at: string | null
  last_run_at: string | null
  created_by_name: string | null
  step_count: number
  has_ai_steps: boolean
  agent_id: string | null
}

export interface WorkspaceAgent {
  type: 'agent'
  id: string
  name: string
  avatar_url: string | null
  created_by: string
  workflows: WorkspaceWorkflow[]
}

export type WorkspaceItem = WorkspaceAgent | WorkspaceWorkflow

export async function fetchWorkspaceItems(supabase: Client, teamId: string) {
  // Fetch workflows
  const { data: workflows } = await supabase
    .from('workflows')
    .select('id, name, emoji, status, updated_at, created_at, published_at, created_by')
    .eq('team_id', teamId)
    .order('name', { ascending: true })

  // Fetch agents
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, avatar_url, created_by')
    .eq('team_id', teamId)
    .order('name', { ascending: true })

  // Fetch agent_skills to map workflows to agents
  const agentIds = (agents ?? []).map((a) => a.id)
  const workflowToAgent: Record<string, string> = {}

  if (agentIds.length > 0) {
    const { data: skills } = await supabase
      .from('agent_skills')
      .select('agent_id, workflow_id')
      .in('agent_id', agentIds)

    if (skills) {
      for (const s of skills) {
        workflowToAgent[s.workflow_id] = s.agent_id
      }
    }
  }

  // Fetch step counts per workflow
  const workflowIds = (workflows ?? []).map((w) => w.id)
  const stepsByWorkflow: Record<string, { count: number; hasAi: boolean }> = {}

  if (workflowIds.length > 0) {
    const { data: steps } = await supabase
      .from('workflow_steps')
      .select('workflow_id, type')
      .in('workflow_id', workflowIds)

    if (steps) {
      for (const step of steps) {
        const entry = stepsByWorkflow[step.workflow_id] ?? { count: 0, hasAi: false }
        entry.count++
        if (step.type === 'ai' || step.type === 'utility') {
          entry.hasAi = true
        }
        stepsByWorkflow[step.workflow_id] = entry
      }
    }
  }

  // Fetch last run timestamps per workflow
  const lastRunByWorkflow: Record<string, string | null> = {}
  if (workflowIds.length > 0) {
    const { data: runs } = await supabase
      .from('workflow_runs')
      .select('workflow_id, started_at, created_at')
      .in('workflow_id', workflowIds)

    if (runs) {
      for (const r of runs) {
        const ts = r.started_at ?? r.created_at ?? null
        if (!ts) continue
        const prev = lastRunByWorkflow[r.workflow_id]
        if (!prev || ts > prev) lastRunByWorkflow[r.workflow_id] = ts
      }
    }
  }

  // Map workflows
  const mappedWorkflows: WorkspaceWorkflow[] = (workflows ?? []).map((w) => ({
    type: 'workflow' as const,
    id: w.id,
    name: w.name,
    emoji: w.emoji,
    status: w.status,
    created_by: w.created_by,
    updated_at: w.updated_at,
    created_at: w.created_at,
    published_at: w.published_at,
    last_run_at: lastRunByWorkflow[w.id] ?? null,
    created_by_name: null,
    step_count: stepsByWorkflow[w.id]?.count ?? 0,
    has_ai_steps: stepsByWorkflow[w.id]?.hasAi ?? false,
    agent_id: workflowToAgent[w.id] ?? null,
  }))

  // Build result: agents with nested workflows + standalone workflows
  const items: WorkspaceItem[] = []
  const agentWorkflows = new Set<string>()

  for (const agent of agents ?? []) {
    const childWorkflows = mappedWorkflows.filter((w) => w.agent_id === agent.id)
    childWorkflows.forEach((w) => agentWorkflows.add(w.id))
    items.push({
      type: 'agent',
      id: agent.id,
      name: agent.name,
      avatar_url: agent.avatar_url,
      created_by: agent.created_by,
      workflows: childWorkflows,
    })
  }

  // Add standalone workflows (not assigned to an agent)
  for (const w of mappedWorkflows) {
    if (!agentWorkflows.has(w.id)) {
      items.push(w)
    }
  }

  return items
}

export async function fetchTeamMembers(supabase: Client, teamId: string) {
  const { data: members } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)

  if (!members || members.length === 0) return []

  const userIds = members.map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  return (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
  }))
}
