import type { Database } from '@/lib/supabase/database.types'

type TriggerType = Database['public']['Enums']['trigger_type']

export interface AppsTriggerConfig {
  app_id: string
  event: string
  filters: Record<string, string>
}

export interface ManualTriggerConfig {
  run_inputs: Array<{
    id: string
    name: string
    type: 'text' | 'number' | 'boolean' | 'select' | 'date'
    required: boolean
    default_value?: string
    options?: string[]
    description?: string
  }>
}

export interface ScheduledTriggerConfig {
  schedule_type: 'cron' | 'interval'
  cron_expression?: string
  interval_value?: number
  interval_unit?: 'minutes' | 'hours' | 'days' | 'weeks'
  timezone: string
  starts_at?: string
  ends_at?: string
}

export interface FormTriggerConfig {
  fields: Array<{
    id: string
    label: string
    type: 'text' | 'textarea' | 'number' | 'email' | 'select' | 'checkbox' | 'date' | 'file'
    required: boolean
    placeholder?: string
    options?: string[]
  }>
  submit_button_text: string
  success_message: string
}

export interface RSSTriggerConfig {
  feed_url: string
  check_interval_minutes: number
  max_items_per_check: number
}

export interface MailhookTriggerConfig {
  address: string
  allowed_senders?: string[]
  subject_filter?: string
  save_attachments: boolean
}

export interface WebhookTriggerConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH'
  secret?: string
  encrypted_secret?: string
  response_status: number
  webhook_token?: string
  response_mode?: 'final' | 'all_steps'
}

export interface TableTriggerConfig {
  table_id: string
  event: 'row_created' | 'row_updated' | 'row_deleted' | 'field_changed'
}

export interface MCPServerTriggerConfig {
  server_name: string
  description: string
  tools: Array<{
    name: string
    description: string
    input_schema: Record<string, unknown>
  }>
}

export type TriggerConfigMap = {
  app: AppsTriggerConfig
  manual: ManualTriggerConfig
  scheduled: ScheduledTriggerConfig
  form: FormTriggerConfig
  rss: RSSTriggerConfig
  mailhook: MailhookTriggerConfig
  webhook: WebhookTriggerConfig
  table: TableTriggerConfig
  mcp: MCPServerTriggerConfig
}

export type TriggerConfig = TriggerConfigMap[TriggerType]

export interface WorkflowTrigger {
  type: TriggerType
  config: TriggerConfig
}

export function getTriggerDefaultConfig(type: TriggerType): TriggerConfig {
  const defaults: Record<TriggerType, TriggerConfig> = {
    app: { app_id: '', event: '', filters: {} },
    manual: { run_inputs: [] },
    scheduled: {
      schedule_type: 'interval',
      interval_value: 1,
      interval_unit: 'hours',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    form: {
      fields: [],
      submit_button_text: 'Submit',
      success_message: 'Form submitted successfully',
    },
    rss: { feed_url: '', check_interval_minutes: 15, max_items_per_check: 10 },
    mailhook: { address: '', save_attachments: true },
    webhook: { url: '', method: 'POST', response_status: 200 },
    table: { table_id: '', event: 'row_created' },
    mcp: { server_name: '', description: '', tools: [] },
  }
  return defaults[type]
}

export function getTriggerSummary(trigger: WorkflowTrigger): string {
  const config = trigger.config
  switch (trigger.type) {
    case 'manual': {
      const c = config as ManualTriggerConfig
      return c.run_inputs.length > 0 ? `${c.run_inputs.length} run inputs` : 'Click to run'
    }
    case 'scheduled': {
      const c = config as ScheduledTriggerConfig
      if (c.schedule_type === 'cron') return c.cron_expression ?? 'Cron schedule'
      return `Every ${c.interval_value} ${c.interval_unit}`
    }
    case 'webhook': {
      const c = config as WebhookTriggerConfig
      return c.url ? `${c.method} ${c.url.slice(0, 30)}` : 'Webhook endpoint'
    }
    case 'form': {
      const c = config as FormTriggerConfig
      return `${c.fields.length} fields`
    }
    case 'rss': {
      const c = config as RSSTriggerConfig
      return c.feed_url ? c.feed_url.slice(0, 30) : 'RSS feed'
    }
    case 'mailhook': {
      const c = config as MailhookTriggerConfig
      return c.address ? c.address.slice(0, 30) : 'Email address'
    }
    case 'table': {
      const c = config as TableTriggerConfig
      return c.event.replace('_', ' ')
    }
    case 'mcp': {
      const c = config as MCPServerTriggerConfig
      return c.server_name || 'MCP Server'
    }
    case 'app': {
      const c = config as AppsTriggerConfig
      return c.app_id ? `${c.app_id}: ${c.event}` : 'Select an app'
    }
  }
}

export function isTriggerConfigComplete(trigger: WorkflowTrigger): boolean {
  const config = trigger.config
  switch (trigger.type) {
    case 'manual':
      return true
    case 'scheduled': {
      const c = config as ScheduledTriggerConfig
      return c.schedule_type === 'cron' ? !!c.cron_expression : !!c.interval_value
    }
    case 'webhook':
      return !!(config as WebhookTriggerConfig).webhook_token
    case 'form':
      return true
    case 'rss':
      return !!(config as RSSTriggerConfig).feed_url
    case 'mailhook':
      return !!(config as MailhookTriggerConfig).address
    case 'table':
      return !!(config as TableTriggerConfig).table_id
    case 'mcp':
      return !!(config as MCPServerTriggerConfig).server_name
    case 'app':
      return !!(config as AppsTriggerConfig).app_id
  }
}
