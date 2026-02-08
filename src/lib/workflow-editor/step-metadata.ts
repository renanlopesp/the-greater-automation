import type { StepType } from '@/lib/supabase/database.types'

export interface StepMeta {
  type: StepType
  name: string
  description: string
  icon: string
}

export const STEP_TYPES: StepMeta[] = [
  {
    type: 'app',
    name: 'App',
    description: 'Perform an action in a connected application',
    icon: 'Blocks',
  },
  {
    type: 'flow_control',
    name: 'Flow Control',
    description: 'Add conditional logic, loops, or branching',
    icon: 'GitBranch',
  },
  {
    type: 'ai',
    name: 'AI',
    description: 'Use AI to transform, classify, or generate content',
    icon: 'Sparkles',
  },
  {
    type: 'web_scraping',
    name: 'Web Scraping',
    description: 'Extract data from websites and web pages',
    icon: 'Globe',
  },
  {
    type: 'human_in_loop',
    name: 'Human in the Loop',
    description: 'Request human approval or input during execution',
    icon: 'UserCheck',
  },
  {
    type: 'utility',
    name: 'Utility',
    description: 'Format, transform, or manipulate data',
    icon: 'Wrench',
  },
  {
    type: 'http',
    name: 'HTTP Request',
    description: 'Make custom HTTP requests to any API',
    icon: 'Send',
  },
  {
    type: 'sequence',
    name: 'Sequence',
    description: 'Group multiple steps into a reusable sequence',
    icon: 'Layers',
  },
]

export interface ConnectedApp {
  id: string
  name: string
  icon: string
}

export const CONNECTED_APPS: ConnectedApp[] = [
  { id: 'email', name: 'Email', icon: 'Mail' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'Linkedin' },
  { id: 'x', name: 'X (Twitter)', icon: 'Twitter' },
  { id: 'youtube', name: 'YouTube', icon: 'Youtube' },
]

export function getStepMeta(type: StepType): StepMeta | undefined {
  return STEP_TYPES.find((s) => s.type === type)
}
