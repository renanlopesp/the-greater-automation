import type { TriggerType } from '@/lib/supabase/database.types'

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
    description: 'Run this workflow manually with optional input fields',
    icon: 'Play',
    hasSubMenu: false,
  },
  {
    type: 'scheduled',
    name: 'Scheduled',
    description: 'Run on a recurring schedule or cron expression',
    icon: 'Clock',
    hasSubMenu: false,
  },
  {
    type: 'webhook',
    name: 'Webhook',
    description: 'Trigger via an incoming HTTP request',
    icon: 'Webhook',
    hasSubMenu: false,
  },
  {
    type: 'form',
    name: 'Form',
    description: 'Trigger when a form is submitted',
    icon: 'FileText',
    hasSubMenu: false,
  },
  {
    type: 'rss',
    name: 'RSS',
    description: 'Trigger when a new RSS feed item is published',
    icon: 'Rss',
    hasSubMenu: false,
  },
  {
    type: 'mailhook',
    name: 'Mailhook',
    description: 'Trigger when an email is received at a specific address',
    icon: 'Mail',
    hasSubMenu: false,
  },
  {
    type: 'app',
    name: 'App',
    description: 'Trigger from a connected app event',
    icon: 'Blocks',
    hasSubMenu: true,
  },
  {
    type: 'table',
    name: 'Table',
    description: 'Trigger when a database table row changes',
    icon: 'Table',
    hasSubMenu: true,
  },
  {
    type: 'mcp',
    name: 'MCP Server',
    description: 'Expose this workflow as an MCP tool',
    icon: 'Server',
    hasSubMenu: false,
  },
]

export function getTriggerMeta(type: TriggerType): TriggerMeta | undefined {
  return TRIGGER_TYPES.find((t) => t.type === type)
}
