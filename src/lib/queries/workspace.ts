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
  folder_id: string | null
}

export interface WorkspaceAgent {
  type: 'agent'
  id: string
  name: string
  avatar_url: string | null
  palette: string | null
  created_by: string
  workflows: WorkspaceWorkflow[]
}

export interface WorkspaceFolder {
  type: 'folder'
  id: string
  name: string
  team_id: string
  parent_id: string | null
  created_by: string
  workflow_count: number
  subfolder_count: number
  created_at: string
  updated_at: string
}

export interface FolderTreeNode {
  id: string
  name: string
  parent_id: string | null
  depth: number
  children: FolderTreeNode[]
}

export type WorkspaceItem = WorkspaceAgent | WorkspaceWorkflow | WorkspaceFolder

export async function fetchWorkspaceItems(supabase: Client, teamId: string) {
  // Fetch workflows and agents in parallel (independent queries)
  const [{ data: workflows }, { data: agents }] = await Promise.all([
    supabase
      .from('workflows')
      .select(
        'id, name, emoji, status, updated_at, created_at, published_at, created_by, folder_id'
      )
      .eq('team_id', teamId)
      .order('name', { ascending: true }),
    supabase
      .from('agents')
      .select('id, name, avatar_url, palette, created_by')
      .eq('team_id', teamId)
      .order('name', { ascending: true }),
  ])

  const agentIds = (agents ?? []).map((a) => a.id)
  const workflowIds = (workflows ?? []).map((w) => w.id)

  // Fetch skills, step counts, and last runs in parallel (all depend on IDs from above)
  const [skillsResult, stepsResult, runsResult] = await Promise.all([
    agentIds.length > 0
      ? supabase.from('agent_skills').select('agent_id, workflow_id').in('agent_id', agentIds)
      : Promise.resolve({ data: null }),
    workflowIds.length > 0
      ? supabase.from('workflow_steps').select('workflow_id, type').in('workflow_id', workflowIds)
      : Promise.resolve({ data: null }),
    workflowIds.length > 0
      ? supabase
          .from('workflow_runs')
          .select('workflow_id, started_at, created_at')
          .in('workflow_id', workflowIds)
      : Promise.resolve({ data: null }),
  ])

  // Build workflow-to-agent map
  const workflowToAgent: Record<string, string> = {}
  if (skillsResult.data) {
    for (const s of skillsResult.data) {
      workflowToAgent[s.workflow_id] = s.agent_id
    }
  }

  // Build step counts map
  const stepsByWorkflow: Record<string, { count: number; hasAi: boolean }> = {}
  if (stepsResult.data) {
    for (const step of stepsResult.data) {
      const entry = stepsByWorkflow[step.workflow_id] ?? { count: 0, hasAi: false }
      entry.count++
      if (step.type === 'ai' || step.type === 'utility') {
        entry.hasAi = true
      }
      stepsByWorkflow[step.workflow_id] = entry
    }
  }

  // Build last run map
  const lastRunByWorkflow: Record<string, string | null> = {}
  if (runsResult.data) {
    for (const r of runsResult.data) {
      const ts = r.started_at ?? r.created_at ?? null
      if (!ts) continue
      const prev = lastRunByWorkflow[r.workflow_id]
      if (!prev || ts > prev) lastRunByWorkflow[r.workflow_id] = ts
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
    folder_id: w.folder_id ?? null,
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
      palette: agent.palette ?? null,
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

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in(
      'id',
      members.map((m) => m.user_id)
    )

  return (profiles ?? []).map((p) => ({ id: p.id, full_name: p.full_name }))
}

export async function fetchFolders(supabase: Client, teamId: string): Promise<WorkspaceFolder[]> {
  const { data: folders } = await supabase
    .from('folders')
    .select('id, name, team_id, parent_id, created_at, updated_at')
    .eq('team_id', teamId)
    .order('name', { ascending: true })

  if (!folders || folders.length === 0) return []

  const folderIds = folders.map((f) => f.id)

  // Count workflows and subfolders per folder in parallel
  const [workflowCountsResult, subfolderCountsResult] = await Promise.all([
    supabase.from('workflows').select('folder_id').eq('team_id', teamId).in('folder_id', folderIds),
    supabase.from('folders').select('parent_id').in('parent_id', folderIds),
  ])

  const workflowCounts: Record<string, number> = {}
  if (workflowCountsResult.data) {
    for (const w of workflowCountsResult.data) {
      if (w.folder_id) {
        workflowCounts[w.folder_id] = (workflowCounts[w.folder_id] ?? 0) + 1
      }
    }
  }

  const subfolderCounts: Record<string, number> = {}
  if (subfolderCountsResult.data) {
    for (const f of subfolderCountsResult.data) {
      if (f.parent_id) {
        subfolderCounts[f.parent_id] = (subfolderCounts[f.parent_id] ?? 0) + 1
      }
    }
  }

  return folders.map((f) => ({
    type: 'folder' as const,
    id: f.id,
    name: f.name,
    team_id: f.team_id,
    parent_id: f.parent_id,
    created_by: '', // folders table doesn't have created_by
    workflow_count: workflowCounts[f.id] ?? 0,
    subfolder_count: subfolderCounts[f.id] ?? 0,
    created_at: f.created_at,
    updated_at: f.updated_at,
  }))
}

export function buildFolderTree(folders: WorkspaceFolder[]): FolderTreeNode[] {
  const nodeMap = new Map<string, FolderTreeNode>()
  const roots: FolderTreeNode[] = []

  // Create nodes
  for (const folder of folders) {
    nodeMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      parent_id: folder.parent_id,
      depth: 0,
      children: [],
    })
  }

  // Build tree
  for (const folder of folders) {
    const node = nodeMap.get(folder.id)!
    if (folder.parent_id && nodeMap.has(folder.parent_id)) {
      nodeMap.get(folder.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Compute depths
  function setDepth(nodes: FolderTreeNode[], depth: number) {
    for (const node of nodes) {
      node.depth = depth
      setDepth(node.children, depth + 1)
    }
  }
  setDepth(roots, 0)

  return roots
}
