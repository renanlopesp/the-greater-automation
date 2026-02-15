'use client'

import type { WorkflowTrigger } from '@/lib/workflow-editor/trigger-defaults'
import type {
  ManualTriggerConfig,
  ScheduledTriggerConfig,
  WebhookTriggerConfig,
  FormTriggerConfig,
  RSSTriggerConfig,
  MailhookTriggerConfig,
  TableTriggerConfig,
  MCPServerTriggerConfig,
  AppsTriggerConfig,
} from '@/lib/workflow-editor/trigger-defaults'
import { ManualTriggerConfigForm } from './manual-trigger-config'
import { ScheduledTriggerConfigForm } from './scheduled-trigger-config'
import { WebhookTriggerConfigForm } from './webhook-trigger-config'
import { FormTriggerConfigForm } from './form-trigger-config'
import { RSSTriggerConfigForm } from './rss-trigger-config'
import { MailhookTriggerConfigForm } from './mailhook-trigger-config'
import { TableTriggerConfigForm } from './table-trigger-config'
import { MCPTriggerConfigForm } from './mcp-trigger-config'
import { AppTriggerConfigForm } from './app-trigger-config'

interface TriggerConfigRouterProps {
  trigger: WorkflowTrigger
  onUpdate: (config: WorkflowTrigger['config']) => void
}

export function TriggerConfigRouter({ trigger, onUpdate }: TriggerConfigRouterProps) {
  switch (trigger.type) {
    case 'manual':
      return (
        <ManualTriggerConfigForm
          config={trigger.config as ManualTriggerConfig}
          onUpdate={onUpdate}
        />
      )
    case 'scheduled':
      return (
        <ScheduledTriggerConfigForm
          config={trigger.config as ScheduledTriggerConfig}
          onUpdate={onUpdate}
        />
      )
    case 'webhook':
      return (
        <WebhookTriggerConfigForm
          config={trigger.config as WebhookTriggerConfig}
          onUpdate={onUpdate}
        />
      )
    case 'form':
      return (
        <FormTriggerConfigForm config={trigger.config as FormTriggerConfig} onUpdate={onUpdate} />
      )
    case 'rss':
      return (
        <RSSTriggerConfigForm config={trigger.config as RSSTriggerConfig} onUpdate={onUpdate} />
      )
    case 'mailhook':
      return (
        <MailhookTriggerConfigForm
          config={trigger.config as MailhookTriggerConfig}
          onUpdate={onUpdate}
        />
      )
    case 'table':
      return (
        <TableTriggerConfigForm config={trigger.config as TableTriggerConfig} onUpdate={onUpdate} />
      )
    case 'mcp':
      return (
        <MCPTriggerConfigForm
          config={trigger.config as MCPServerTriggerConfig}
          onUpdate={onUpdate}
        />
      )
    case 'app':
      return (
        <AppTriggerConfigForm config={trigger.config as AppsTriggerConfig} onUpdate={onUpdate} />
      )
    default:
      return null
  }
}
