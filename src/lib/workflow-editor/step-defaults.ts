import type { StepType } from '@/lib/supabase/database.types'

export interface AppStepConfig {
  app_id: string
  action: string
  inputs: Record<string, unknown>
}

export interface FlowControlStepConfig {
  control_type: 'path'
}

export interface AIStepConfig {
  ai_action: 'summarize' | 'classify' | 'extract' | 'generate' | 'transform'
  prompt_template: string
  output_format: 'text' | 'json' | 'markdown'
  temperature: number
  max_tokens: number
}

export interface WebScrapingStepConfig {
  scrape_type: 'url'
  url: string
  output_format: 'text' | 'html' | 'json'
}

export interface HumanInLoopStepConfig {
  action_type: 'approval' | 'input' | 'review'
  assignee_type: 'anyone' | 'specific'
  prompt: string
  include_context: boolean
}

export interface UtilityStepConfig {
  utility_type: 'format'
}

export interface HTTPStepConfig {
  request_type: 'custom'
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  timeout_seconds: number
  retry_count: number
}

export interface SequenceStepConfig {
  inline_steps: unknown[]
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
    flow_control: { control_type: 'path' },
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
    utility: { utility_type: 'format' },
    http: { request_type: 'custom', method: 'GET', url: '', timeout_seconds: 30, retry_count: 0 },
    sequence: { inline_steps: [] },
  }
  return defaults[type]
}

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
