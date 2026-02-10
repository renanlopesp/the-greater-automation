import type { Json, StepType, TriggerType } from '@/lib/supabase/database.types'

interface TemplateStep {
  position: number
  type: StepType
  name: string
  config: Json
}

interface TemplateTrigger {
  type: TriggerType
  config: Json
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  emoji: string
  steps: TemplateStep[]
  trigger: TemplateTrigger
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'email-automation',
    name: 'Email Automation',
    description: 'Automate email workflows with AI-powered content generation',
    emoji: '\u{1F4E7}',
    steps: [
      { position: 0, type: 'app', name: 'Receive Email', config: {} },
      { position: 1, type: 'ai', name: 'Generate Response', config: {} },
      { position: 2, type: 'app', name: 'Send Email', config: {} },
    ],
    trigger: { type: 'app', config: {} },
  },
  {
    id: 'data-sync',
    name: 'Data Sync',
    description: 'Synchronize data between services on a recurring schedule',
    emoji: '\u{1F504}',
    steps: [
      { position: 0, type: 'http', name: 'Fetch Source Data', config: {} },
      { position: 1, type: 'app', name: 'Update Destination', config: {} },
    ],
    trigger: { type: 'scheduled', config: {} },
  },
  {
    id: 'approval-flow',
    name: 'Approval Flow',
    description: 'Route submissions through human review with AI-assisted decisions',
    emoji: '\u{2705}',
    steps: [
      { position: 0, type: 'human_in_loop', name: 'Review Submission', config: {} },
      { position: 1, type: 'ai', name: 'Analyze Content', config: {} },
      { position: 2, type: 'app', name: 'Notify Result', config: {} },
    ],
    trigger: { type: 'form', config: {} },
  },
  {
    id: 'web-scraping',
    name: 'Web Scraping',
    description: 'Extract and process web data with AI-powered analysis',
    emoji: '\u{1F310}',
    steps: [
      { position: 0, type: 'web_scraping', name: 'Scrape Website', config: {} },
      { position: 1, type: 'ai', name: 'Extract Insights', config: {} },
      { position: 2, type: 'utility', name: 'Format Output', config: {} },
    ],
    trigger: { type: 'manual', config: {} },
  },
]
