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
    description: 'Execute uma ação em um aplicativo conectado',
    icon: 'Blocks',
  },
  {
    type: 'flow_control',
    name: 'Controle de Fluxo',
    description: 'Adicione lógica condicional, loops ou ramificação',
    icon: 'GitBranch',
  },
  {
    type: 'ai',
    name: 'AI',
    description: 'Use IA para transformar, classificar ou gerar conteúdo',
    icon: 'Sparkles',
  },
  {
    type: 'web_scraping',
    name: 'Web Scraping',
    description: 'Extraia dados de sites e páginas web',
    icon: 'Globe',
  },
  {
    type: 'human_in_loop',
    name: 'Intervenção Humana',
    description: 'Solicite aprovação humana ou entrada durante a execução',
    icon: 'UserCheck',
  },
  {
    type: 'utility',
    name: 'Utility',
    description: 'Formate, transforme ou manipule dados',
    icon: 'Wrench',
  },
  {
    type: 'http',
    name: 'Requisição HTTP',
    description: 'Faça requisições HTTP personalizadas para qualquer API',
    icon: 'Send',
  },
  {
    type: 'sequence',
    name: 'Sequência',
    description: 'Agrupe múltiplas etapas em uma sequência reutilizável',
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
