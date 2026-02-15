// ---------------------------------------------------------------------------
// Workflow Definition Types — Real Agent Workflows System
// ---------------------------------------------------------------------------

export type WorkflowTriggerType = 'manual' | 'chat_command' | 'webhook' | 'scheduled' | 'app_event'
export type WorkflowActionType = 'composio_action' | 'ai_transform' | 'notify' | 'claude_agent'
export type WorkflowExecutionMode = 'auto' | 'confirm' | 'draft'
export type WorkflowSource = 'manual' | 'dynamic' | 'rule'

export type WorkflowRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting_confirmation'

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'matches'
  | 'exists'
  | 'not_exists'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'

// ---------------------------------------------------------------------------
// Trigger configs
// ---------------------------------------------------------------------------

export interface ManualTriggerConfig {
  type: 'manual'
}

export interface ChatCommandTriggerConfig {
  type: 'chat_command'
  command: string // e.g. "summarize", "deploy"
  description?: string
}

export interface WebhookTriggerConfig {
  type: 'webhook'
  webhook_token: string
  webhook_secret: string // HMAC secret for signature verification
  webhook_url?: string // computed, not stored
}

export interface ScheduledTriggerConfig {
  type: 'scheduled'
  cron_expression: string // e.g. "0 9 * * 1-5"
  timezone?: string
}

export interface AppEventTriggerConfig {
  type: 'app_event'
  trigger_slug: string // Composio trigger slug, e.g., "GITHUB_PULL_REQUEST_OPENED"
  app_id: string // e.g., "github"
  trigger_config?: Record<string, unknown> // App-specific config params
}

export type WorkflowTriggerConfig =
  | ManualTriggerConfig
  | ChatCommandTriggerConfig
  | WebhookTriggerConfig
  | ScheduledTriggerConfig
  | AppEventTriggerConfig

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export interface WorkflowCondition {
  field: string // dot-path into trigger_data, e.g. "body.sender"
  operator: ConditionOperator
  value?: string | number | boolean // not needed for exists/not_exists
}

export interface ConditionResult {
  condition: WorkflowCondition
  passed: boolean
  actual_value?: unknown
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface ComposioActionConfig {
  type: 'composio_action'
  action: string // Composio action ID, e.g. "SLACK_SEND_MESSAGE"
  app_id: string // e.g. "slack"
  params: Record<string, unknown> // supports {{trigger.field}} and {{prev.key}} templates; values can be strings, arrays, or numbers
}

export interface AiTransformActionConfig {
  type: 'ai_transform'
  prompt: string // supports {{trigger.field}} templates
  output_key: string // key to store result for next action
  model?: string
}

export interface NotifyActionConfig {
  type: 'notify'
  channel: 'internal' | 'slack' | 'email'
  message: string // supports {{trigger.field}} templates
  target?: string // channel name, email, etc.
}

export interface ClaudeAgentActionConfig {
  type: 'claude_agent'
  prompt: string // supports {{trigger.field}} and {{prev.key}} templates
  output_key: string // key to store result for next action
  tools?: string[] // Composio tool names the agent can use
  model?: string // AI model to use (default: gpt-4o-mini)
  timeout_ms?: number // max execution time (default: 300000)
  output_format?: 'text' | 'json' // structured output format
}

export type WorkflowActionConfig =
  | ComposioActionConfig
  | AiTransformActionConfig
  | NotifyActionConfig
  | ClaudeAgentActionConfig

// ---------------------------------------------------------------------------
// Full Workflow Definition (what the AI builds via SNEW_CREATE_WORKFLOW)
// ---------------------------------------------------------------------------

export interface WorkflowDefinition {
  name: string
  description?: string
  trigger: WorkflowTriggerConfig
  conditions: WorkflowCondition[]
  actions: WorkflowActionConfig[]
  execution_mode: WorkflowExecutionMode
}

// ---------------------------------------------------------------------------
// Workflow Run (execution record)
// ---------------------------------------------------------------------------

export interface WorkflowRun {
  id: string
  workflow_id: string
  agent_id: string
  status: WorkflowRunStatus
  trigger_data: Record<string, unknown> | null
  condition_results: ConditionResult[] | null
  actions_executed: ActionExecutionResult[] | null
  error: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  created_at: string
  event_log_id?: string | null
  pipeline_steps?: PipelineStepRecord[] | null
  current_step_index?: number | null
}

export interface ActionExecutionResult {
  action_type: WorkflowActionType
  action_config: WorkflowActionConfig
  status: 'success' | 'failed' | 'skipped'
  output?: unknown
  error?: string
  duration_ms?: number
}

export interface PipelineStepRecord {
  step_index: number
  action_type: WorkflowActionType
  action_config: WorkflowActionConfig
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  output?: unknown
  error?: string
  started_at?: string
  completed_at?: string
  duration_ms?: number
}

// ---------------------------------------------------------------------------
// DB row type (what comes from Supabase)
// ---------------------------------------------------------------------------

export interface AgentWorkflowRow {
  id: string
  agent_id: string
  workflow_id: string | null
  name: string
  description: string | null
  source: WorkflowSource | null
  action_template: Record<string, unknown> | null
  trigger_config: WorkflowTriggerConfig | null
  conditions: WorkflowCondition[]
  actions: WorkflowActionConfig[]
  is_enabled: boolean
  execution_mode: WorkflowExecutionMode
  last_run_at: string | null
  run_count: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Trigger Subscription (DB row type)
// ---------------------------------------------------------------------------

export interface TriggerSubscriptionRow {
  id: string
  agent_workflow_id: string
  agent_id: string
  user_id: string
  composio_trigger_id: string
  trigger_slug: string
  app_id: string
  trigger_config: Record<string, unknown>
  filters: WorkflowCondition[]
  field_mappings: Record<string, string>
  is_enabled: boolean
  last_event_at: string | null
  event_count: number
  created_at: string
  updated_at: string
}
