'use client'

import type { ReactNode } from 'react'
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
import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const ManualTriggerConfigForm = lazy(() =>
  import('./manual-trigger-config').then((m) => ({ default: m.ManualTriggerConfigForm }))
)
const ScheduledTriggerConfigForm = lazy(() =>
  import('./scheduled-trigger-config').then((m) => ({ default: m.ScheduledTriggerConfigForm }))
)
const WebhookTriggerConfigForm = lazy(() =>
  import('./webhook-trigger-config').then((m) => ({ default: m.WebhookTriggerConfigForm }))
)
const FormTriggerConfigForm = lazy(() =>
  import('./form-trigger-config').then((m) => ({ default: m.FormTriggerConfigForm }))
)
const RSSTriggerConfigForm = lazy(() =>
  import('./rss-trigger-config').then((m) => ({ default: m.RSSTriggerConfigForm }))
)
const MailhookTriggerConfigForm = lazy(() =>
  import('./mailhook-trigger-config').then((m) => ({ default: m.MailhookTriggerConfigForm }))
)
const TableTriggerConfigForm = lazy(() =>
  import('./table-trigger-config').then((m) => ({ default: m.TableTriggerConfigForm }))
)
const MCPTriggerConfigForm = lazy(() =>
  import('./mcp-trigger-config').then((m) => ({ default: m.MCPTriggerConfigForm }))
)
const AppTriggerConfigForm = lazy(() =>
  import('./app-trigger-config').then((m) => ({ default: m.AppTriggerConfigForm }))
)

interface TriggerConfigRouterProps {
  trigger: WorkflowTrigger
  onUpdate: (config: WorkflowTrigger['config']) => void
}

const triggerFallback = (
  <div className="space-y-3 p-4">
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-8 w-2/3" />
  </div>
)

export function TriggerConfigRouter({ trigger, onUpdate }: TriggerConfigRouterProps) {
  let form: ReactNode
  switch (trigger.type) {
    case 'manual':
      form = (
        <ManualTriggerConfigForm
          config={trigger.config as ManualTriggerConfig}
          onUpdate={onUpdate}
        />
      )
      break
    case 'scheduled':
      form = (
        <ScheduledTriggerConfigForm
          config={trigger.config as ScheduledTriggerConfig}
          onUpdate={onUpdate}
        />
      )
      break
    case 'webhook':
      form = (
        <WebhookTriggerConfigForm
          config={trigger.config as WebhookTriggerConfig}
          onUpdate={onUpdate}
        />
      )
      break
    case 'form':
      form = (
        <FormTriggerConfigForm config={trigger.config as FormTriggerConfig} onUpdate={onUpdate} />
      )
      break
    case 'rss':
      form = (
        <RSSTriggerConfigForm config={trigger.config as RSSTriggerConfig} onUpdate={onUpdate} />
      )
      break
    case 'mailhook':
      form = (
        <MailhookTriggerConfigForm
          config={trigger.config as MailhookTriggerConfig}
          onUpdate={onUpdate}
        />
      )
      break
    case 'table':
      form = (
        <TableTriggerConfigForm config={trigger.config as TableTriggerConfig} onUpdate={onUpdate} />
      )
      break
    case 'mcp':
      form = (
        <MCPTriggerConfigForm
          config={trigger.config as MCPServerTriggerConfig}
          onUpdate={onUpdate}
        />
      )
      break
    case 'app':
      form = (
        <AppTriggerConfigForm config={trigger.config as AppsTriggerConfig} onUpdate={onUpdate} />
      )
      break
    default:
      return null
  }

  return <Suspense fallback={triggerFallback}>{form}</Suspense>
}
