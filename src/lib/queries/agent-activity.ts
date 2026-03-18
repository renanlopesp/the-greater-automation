import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type {
  AgentActivityData,
  ActionLogItem,
  ArtifactOutputType,
  AgentModuleRow,
} from '@/lib/modules/types'
import { KpiSummaryOutputSchema } from '@/lib/modules/output-schemas'
import { resolveModuleWithStatus } from '@/lib/modules/status'
import type { ModuleWithStatus } from '@/lib/modules/types'

type Client = SupabaseClient<Database>

/**
 * Fetches activity data for an agent on a given date (defaults to today).
 * Reads from workflow_run_outputs joined via agent_modules.
 */
export async function fetchAgentActivity(
  supabase: Client,
  agentId: string,
  date?: string
): Promise<AgentActivityData> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10)
  const startOfDay = `${targetDate}T00:00:00.000Z`
  const endOfDay = `${targetDate}T23:59:59.999Z`

  // Fetch all run outputs for this agent's modules on the given date
  const { data: rows, error } = await supabase
    .from('workflow_run_outputs' as never)
    .select(
      'id, output_type, output_data, summary_text, created_at, module_id, agent_modules!inner(agent_id)'
    )
    .eq('agent_modules.agent_id' as never, agentId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: false })

  if (error || !rows) {
    return { summary: '', kpis: [], actions: [] }
  }

  type OutputRow = {
    id: string
    output_type: string
    output_data: unknown
    summary_text: string | null
    created_at: string
    module_id: string
  }

  const outputs = rows as OutputRow[]

  // Find kpi-summary row first
  const kpiRow = outputs.find((r) => r.output_type === 'kpi-summary')
  let summary = ''
  let kpis: AgentActivityData['kpis'] = []

  if (kpiRow) {
    const parsed = KpiSummaryOutputSchema.safeParse(kpiRow.output_data)
    if (parsed.success) {
      summary = parsed.data.summary
      kpis = parsed.data.kpis
    }
  }

  // All other outputs become action log items
  const actions: ActionLogItem[] = outputs
    .filter((r) => r.output_type !== 'kpi-summary')
    .map((r) => ({
      id: r.id,
      summaryText: r.summary_text ?? r.output_type,
      outputType: r.output_type as ArtifactOutputType,
      status: 'done' as const,
      timestamp: r.created_at,
      runOutputId: r.id,
    }))

  return { summary, kpis, actions }
}

/**
 * Fetches a single workflow_run_output row by ID.
 */
export async function fetchArtifact(supabase: Client, runOutputId: string) {
  const { data, error } = await supabase
    .from('workflow_run_outputs' as never)
    .select('*')
    .eq('id', runOutputId)
    .single()

  if (error || !data) return null
  return data as {
    id: string
    workflow_run_id: string
    module_id: string
    output_type: string
    output_data: unknown
    summary_text: string | null
    created_at: string
  }
}

/**
 * Fetches all modules for an agent with computed status based on active connections.
 */
export async function fetchAgentModulesWithStatus(
  supabase: Client,
  agentId: string
): Promise<ModuleWithStatus[]> {
  const { data: moduleRows, error: moduleError } = await supabase
    .from('agent_modules' as never)
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })

  if (moduleError || !moduleRows) return []

  // Fetch active connection app_keys for this agent's team
  const { data: agentRow } = await supabase
    .from('agents')
    .select('team_id')
    .eq('id', agentId)
    .single()

  let activeConnections: string[] = []

  if (agentRow?.team_id) {
    // Fetch Composio app connections (e.g. google_analytics, gmail)
    const { data: connRows } = await supabase
      .from('app_connections')
      .select('app_id')
      .eq('team_id', agentRow.team_id)

    if (connRows) {
      activeConnections = connRows.map((c) => c.app_id)
    }

    // Also check native store connection (Nuvemshop/Shopify use stores table, not app_connections)
    const { data: store } = await supabase
      .from('stores')
      .select('platform, platform_store_id, platform_access_token')
      .eq('team_id', agentRow.team_id)
      .limit(1)
      .maybeSingle()

    if (store?.platform && store.platform_store_id && store.platform_access_token) {
      activeConnections.push(store.platform)
    }
  }

  return (moduleRows as AgentModuleRow[]).map((mod) =>
    resolveModuleWithStatus(mod, activeConnections)
  )
}
