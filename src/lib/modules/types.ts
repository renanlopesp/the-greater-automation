/**
 * Module system types for the Agent Modules System (spec 036).
 *
 * Modules are executable capabilities backed by workflows.
 * Each agent type has a fixed set of module definitions in the registry.
 */

// ---------------------------------------------------------------------------
// Module status
// ---------------------------------------------------------------------------

export type ModuleStatus = 'active' | 'paused' | 'requires_connection' | 'error'

// ---------------------------------------------------------------------------
// Registry types (code, not DB)
// ---------------------------------------------------------------------------

export interface WorkflowDefinition {
  /** Trigger type, e.g. 'cron' or 'webhook' */
  triggerType: string
  /** Cron expression when triggerType is 'cron' */
  cronExpression?: string
  /** Human-readable step descriptions (for display/provisioning) */
  stepDescriptions: string[]
}

export interface ModuleDefinition {
  moduleType: string
  name: string
  description: string
  /** App connection identifiers required for this module to be active */
  requiredConnections: string[]
  workflows: WorkflowDefinition[]
}

export interface AgentTypeDefinition {
  agentType: string
  name: string
  category: string
  description: string
  modules: ModuleDefinition[]
}

// ---------------------------------------------------------------------------
// Artifact output types
// ---------------------------------------------------------------------------

export type ArtifactOutputType =
  | 'cart-table'
  | 'channel-performance'
  | 'conversion-list'
  | 'message-approval'
  | 'category-chart'
  | 'escalation-cards'
  | 'kpi-summary'

// ---------------------------------------------------------------------------
// Activity feed types
// ---------------------------------------------------------------------------

export interface ActionLogItem {
  id: string
  summaryText: string
  outputType: ArtifactOutputType
  status: 'done' | 'in_progress' | 'scheduled' | 'pending'
  timestamp: string
  runOutputId: string
}

export interface AgentActivityData {
  summary: string
  kpis: { label: string; value: string }[]
  actions: ActionLogItem[]
}

// ---------------------------------------------------------------------------
// DB row + computed status
// ---------------------------------------------------------------------------

/** Raw agent_modules row from the database */
export interface AgentModuleRow {
  id: string
  agent_id: string
  module_type: string
  name: string
  description: string | null
  enabled: boolean
  required_connections: string[]
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Connection status for a single required connection */
export interface ConnectionStatus {
  appKey: string
  connected: boolean
  lastSyncAt: string | null
}

/** Module row augmented with computed status and connection statuses */
export interface ModuleWithStatus extends AgentModuleRow {
  status: ModuleStatus
  connectionStatuses: ConnectionStatus[]
}

// ---------------------------------------------------------------------------
// Output data interfaces (match JSONB schemas in workflow_run_outputs)
// ---------------------------------------------------------------------------

export interface CartItem {
  customer_name: string
  product: string
  value: number
  abandoned_ago: string
  status: 'enviado' | 'convertido' | 'aguardando'
}

export interface CartTableOutput {
  carts: CartItem[]
  total_detected: number
  total_recovered: number
  total_value_at_risk: number
}

export interface ChannelStat {
  name: string
  sent: number
  converted: number
  conversion_rate: number
}

export interface ChannelPerformanceOutput {
  channels: ChannelStat[]
  insight: string
}

export interface ConversionItem {
  customer_name: string
  product: string
  value: number
  channel: string
}

export interface ConversionListOutput {
  conversions: ConversionItem[]
  total_recovered_value: number
  insight: string
}

export interface MessageApprovalOutput {
  template: string
  store_name: string
  recipient_count: number
  scheduled_for: string
  status: 'pending_approval' | 'approved' | 'sent'
}

export interface CategoryItem {
  name: string
  count: number
  color: string
}

export interface CategoryChartOutput {
  categories: CategoryItem[]
  total: number
  insight: string
}

export interface EscalationCase {
  customer_name: string
  status: 'andamento' | 'resolvido' | 'aguardando'
  problem: string
  action_taken: string
  escalation_reason: string
}

export interface EscalationCardsOutput {
  cases: EscalationCase[]
}

export interface KpiItem {
  label: string
  value: string
}

export interface KpiSummaryOutput {
  kpis: KpiItem[]
  summary: string
}
