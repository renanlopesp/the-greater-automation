import type { StepType } from '@/lib/supabase/database.types'

export interface AppStepConfig {
  app_id: string
  action: string
  inputs: Record<string, unknown>
}

export interface FlowControlStepConfig {
  control_type: 'path' | 'loop' | 'wait'
  conditions?: Array<{ field: string; operator: string; value: string }>
  default_path?: string
  loop_source?: string
  loop_count?: number
  wait_duration?: number
  wait_unit?: 'seconds' | 'minutes' | 'hours'
}

export interface AIStepConfig {
  ai_action: 'summarize' | 'classify' | 'extract' | 'generate' | 'transform'
  prompt_template: string
  output_format: 'text' | 'json' | 'markdown'
  temperature: number
  max_tokens: number
}

export interface WebScrapingStepConfig {
  scrape_type: 'url' | 'css_selector' | 'xpath'
  url: string
  selector?: string
  wait_for_selector?: boolean
  output_format: 'text' | 'html' | 'json'
}

export interface HumanInLoopStepConfig {
  action_type: 'approval' | 'input' | 'review'
  assignee_type: 'anyone' | 'specific'
  assignee?: string
  prompt: string
  include_context: boolean
  timeout_minutes?: number
}

export interface UtilityStepConfig {
  utility_type: 'format' | 'parse_json' | 'parse_csv' | 'merge' | 'filter' | 'map' | 'math'
  input_source?: string
  format_template?: string
  filter_condition?: string
  math_expression?: string
}

export interface HTTPStepConfig {
  request_type: 'custom'
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers?: Record<string, string>
  body?: string
  auth?: { type: 'none' | 'bearer' | 'basic' | 'api_key'; value: string }
  timeout_seconds: number
  retry_count: number
}

export interface SequenceStepConfig {
  inline_steps: Array<{ id: string; type: StepType; name: string; config: Record<string, unknown> }>
}

export type StepConfigMap = {
  app: AppStepConfig
  flow_control: FlowControlStepConfig
  ai: AIStepConfig
  web_scraping: WebScrapingStepConfig
  human_in_loop: HumanInLoopStepConfig
  utility: UtilityStepConfig
  http: HTTPStepConfig
  sequence: SequenceStepConfig
}

export type StepConfig = StepConfigMap[StepType]

export interface WorkflowStep {
  id: string
  type: StepType
  name: string
  position: number
  config: StepConfig
}

export function getStepDefaultConfig(type: StepType): StepConfig {
  const defaults: Record<StepType, StepConfig> = {
    app: { app_id: '', action: '', inputs: {} },
    flow_control: { control_type: 'path', conditions: [], default_path: '' },
    ai: {
      ai_action: 'summarize',
      prompt_template: '',
      output_format: 'text',
      temperature: 0.7,
      max_tokens: 1000,
    },
    web_scraping: { scrape_type: 'url', url: '', output_format: 'text' },
    human_in_loop: {
      action_type: 'approval',
      assignee_type: 'anyone',
      prompt: '',
      include_context: true,
    },
    utility: { utility_type: 'format', input_source: '' },
    http: { request_type: 'custom', method: 'GET', url: '', timeout_seconds: 30, retry_count: 0 },
    sequence: { inline_steps: [] },
  }
  return defaults[type]
}

export const TESTABLE_STEP_TYPES: StepType[] = ['ai', 'http']

export function isStepConfigComplete(step: WorkflowStep): boolean {
  switch (step.type) {
    case 'ai':
      return !!(step.config as AIStepConfig).prompt_template
    case 'http':
      return !!(step.config as HTTPStepConfig).url
    case 'web_scraping':
      return !!(step.config as WebScrapingStepConfig).url
    case 'app':
      return !!(step.config as AppStepConfig).app_id
    case 'human_in_loop':
      return !!(step.config as HumanInLoopStepConfig).prompt
    default:
      return true
  }
}
