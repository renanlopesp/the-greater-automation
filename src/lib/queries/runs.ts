import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>
type RunStatus = Database['public']['Enums']['run_status']

export interface Run {
  id: string
  workflow_id: string
  workflow_name: string
  workflow_emoji: string | null
  status: RunStatus
  steps_used: number
  ai_credits_used: number
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface FetchRunsResult {
  data: Run[]
  nextCursor: string | null
}

export async function fetchRuns(
  supabase: Client,
  teamId: string,
  options?: { cursor?: string; limit?: number; status?: string; workflowId?: string }
): Promise<FetchRunsResult> {
  const limit = options?.limit ?? 50

  // Get workflows for this team first
  const { data: teamWorkflows } = await supabase
    .from('workflows')
    .select('id, name, emoji')
    .eq('team_id', teamId)

  const workflowMap = new Map(
    (teamWorkflows ?? []).map((w) => [w.id, { name: w.name, emoji: w.emoji }])
  )
  const workflowIds = Array.from(workflowMap.keys())

  if (workflowIds.length === 0) {
    return { data: [], nextCursor: null }
  }

  let query = supabase
    .from('workflow_runs')
    .select(
      'id, workflow_id, status, steps_used, ai_credits_used, started_at, completed_at, created_at'
    )
    .in('workflow_id', options?.workflowId ? [options.workflowId] : workflowIds)
    .order('started_at', { ascending: false, nullsFirst: false })
    .limit(limit + 1)

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status as RunStatus)
  }

  if (options?.cursor) {
    query = query.lt('started_at', options.cursor)
  }

  const { data: runs } = await query

  const results = (runs ?? []).slice(0, limit)
  const hasMore = (runs ?? []).length > limit
  const nextCursor = hasMore ? (results[results.length - 1]?.started_at ?? null) : null

  return {
    data: results.map((r) => ({
      id: r.id,
      workflow_id: r.workflow_id,
      workflow_name: workflowMap.get(r.workflow_id)?.name ?? 'Unknown',
      workflow_emoji: workflowMap.get(r.workflow_id)?.emoji ?? null,
      status: r.status,
      steps_used: r.steps_used,
      ai_credits_used: r.ai_credits_used,
      started_at: r.started_at,
      completed_at: r.completed_at,
      created_at: r.created_at,
    })),
    nextCursor,
  }
}

export async function fetchWorkflowList(supabase: Client, teamId: string) {
  const { data } = await supabase
    .from('workflows')
    .select('id, name')
    .eq('team_id', teamId)
    .order('name', { ascending: true })

  return data ?? []
}
