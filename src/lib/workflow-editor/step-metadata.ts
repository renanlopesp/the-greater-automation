import type { Database } from '@/lib/supabase/database.types'

type StepType = Database['public']['Enums']['step_type']

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
  { id: 'github', name: 'GitHub', icon: 'Github' },
  { id: 'notion', name: 'Notion', icon: 'BookOpen' },
  { id: 'slack', name: 'Slack', icon: 'Hash' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'Linkedin' },
  { id: 'discord', name: 'Discord', icon: 'MessageCircle' },
]

export function getStepMeta(type: StepType): StepMeta | undefined {
  return STEP_TYPES.find((s) => s.type === type)
}
