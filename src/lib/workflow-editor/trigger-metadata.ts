import type { Database } from '@/lib/supabase/database.types'

type TriggerType = Database['public']['Enums']['trigger_type']

export interface TriggerMeta {
  type: TriggerType
  name: string
  description: string
  icon: string
  hasSubMenu: boolean
}

export const TRIGGER_TYPES: TriggerMeta[] = [
  {
    type: 'manual',
    name: 'Manual',
    description: 'Execute esta automação manualmente com campos de entrada opcionais',
    icon: 'Play',
    hasSubMenu: false,
  },
  {
    type: 'scheduled',
    name: 'Scheduled',
    description: 'Execute em um agendamento recorrente ou expressão cron',
    icon: 'Clock',
    hasSubMenu: false,
  },
  {
    type: 'webhook',
    name: 'Webhook',
    description: 'Dispara via uma requisição HTTP recebida',
    icon: 'Webhook',
    hasSubMenu: false,
  },
  {
    type: 'form',
    name: 'Form',
    description: 'Dispara quando um formulário é enviado',
    icon: 'FileText',
    hasSubMenu: false,
  },
  {
    type: 'rss',
    name: 'RSS',
    description: 'Dispara quando um novo item do feed RSS é publicado',
    icon: 'Rss',
    hasSubMenu: false,
  },
  {
    type: 'mailhook',
    name: 'Mailhook',
    description: 'Dispara quando um e-mail é recebido em um endereço específico',
    icon: 'Mail',
    hasSubMenu: false,
  },
  {
    type: 'app',
    name: 'App',
    description: 'Dispara a partir de um evento de aplicativo conectado',
    icon: 'Blocks',
    hasSubMenu: true,
  },
  {
    type: 'table',
    name: 'Table',
    description: 'Dispara quando uma linha da tabela muda',
    icon: 'Table',
    hasSubMenu: true,
  },
  {
    type: 'mcp',
    name: 'MCP Server',
    description: 'Exponha esta automação como uma ferramenta MCP',
    icon: 'Server',
    hasSubMenu: false,
  },
]

export function getTriggerMeta(type: TriggerType): TriggerMeta | undefined {
  return TRIGGER_TYPES.find((t) => t.type === type)
}
