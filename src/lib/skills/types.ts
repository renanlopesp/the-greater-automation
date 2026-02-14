// ---------------------------------------------------------------------------
// Skill Definition Types — Real Agent Skills System
// ---------------------------------------------------------------------------

export type SkillTriggerType = 'manual' | 'chat_command' | 'webhook' | 'scheduled'
export type SkillActionType = 'composio_action' | 'ai_transform' | 'notify'
export type SkillExecutionMode = 'auto' | 'confirm' | 'draft'
export type SkillSource = 'manual' | 'dynamic' | 'rule'

export type SkillRunStatus =
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
  webhook_url?: string // computed, not stored
}

export interface ScheduledTriggerConfig {
  type: 'scheduled'
  cron_expression: string // e.g. "0 9 * * 1-5"
  timezone?: string
}

export type SkillTriggerConfig =
  | ManualTriggerConfig
  | ChatCommandTriggerConfig
  | WebhookTriggerConfig
  | ScheduledTriggerConfig

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export interface SkillCondition {
  field: string // dot-path into trigger_data, e.g. "body.sender"
  operator: ConditionOperator
  value?: string | number | boolean // not needed for exists/not_exists
}

export interface ConditionResult {
  condition: SkillCondition
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

export type SkillActionConfig = ComposioActionConfig | AiTransformActionConfig | NotifyActionConfig

// ---------------------------------------------------------------------------
// Full Skill Definition (what the AI builds via SNEW_CREATE_SKILL)
// ---------------------------------------------------------------------------

export interface SkillDefinition {
  name: string
  description?: string
  trigger: SkillTriggerConfig
  conditions: SkillCondition[]
  actions: SkillActionConfig[]
  execution_mode: SkillExecutionMode
}

// ---------------------------------------------------------------------------
// Skill Run (execution record)
// ---------------------------------------------------------------------------

export interface SkillRun {
  id: string
  skill_id: string
  agent_id: string
  status: SkillRunStatus
  trigger_data: Record<string, unknown> | null
  condition_results: ConditionResult[] | null
  actions_executed: ActionExecutionResult[] | null
  error: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  created_at: string
}

export interface ActionExecutionResult {
  action_type: SkillActionType
  action_config: SkillActionConfig
  status: 'success' | 'failed' | 'skipped'
  output?: unknown
  error?: string
  duration_ms?: number
}

// ---------------------------------------------------------------------------
// DB row type (what comes from Supabase)
// ---------------------------------------------------------------------------

export interface AgentSkillRow {
  id: string
  agent_id: string
  workflow_id: string | null
  name: string
  description: string | null
  source: SkillSource | null
  action_template: Record<string, unknown> | null
  trigger_config: SkillTriggerConfig | null
  conditions: SkillCondition[]
  actions: SkillActionConfig[]
  is_enabled: boolean
  execution_mode: SkillExecutionMode
  last_run_at: string | null
  run_count: number
  created_at: string
  updated_at: string
}
