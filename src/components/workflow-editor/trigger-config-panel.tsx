'use client'

import { RefreshCw } from 'lucide-react'
import { DynamicIcon } from '@/lib/workflow-editor/icon-registry'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { getTriggerMeta } from '@/lib/workflow-editor/trigger-metadata'
import { TriggerConfigRouter } from '@/components/workflow-editor/trigger-config'
import TriggerSelector from '@/components/workflow-editor/trigger-selector'
import {
  getTriggerDefaultConfig,
  type WebhookTriggerConfig,
} from '@/lib/workflow-editor/trigger-defaults'
import { generateWebhookToken } from '@/lib/workflow-editor/webhook-utils'
import { useState } from 'react'

export default function TriggerConfigPanel() {
  const trigger = useWorkflowEditorStore((s) => s.trigger)
  const setTrigger = useWorkflowEditorStore((s) => s.setTrigger)
  const closeTriggerConfig = useWorkflowEditorStore((s) => s.closeTriggerConfig)
  const workflowStatus = useWorkflowEditorStore((s) => s.workflowStatus)
  const [selectorOpen, setSelectorOpen] = useState(false)

  if (!trigger) return null

  const meta = getTriggerMeta(trigger.type)

  return (
    <div className="flex h-full w-full flex-col border-l">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
          {meta && <DynamicIcon name={meta.icon} className="text-primary h-4 w-4" />}
        </div>
        <span className="flex-1 truncate text-sm font-medium">{meta?.name ?? trigger.type}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => setSelectorOpen(true)}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Change type
        </Button>
      </div>

      <div className="scrollbar-visible min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 p-4">
          <p className="text-muted-foreground text-sm">{meta?.description}</p>
          <Separator />
          <TriggerConfigRouter
            trigger={trigger}
            onUpdate={(config) => setTrigger({ ...trigger, config })}
          />
        </div>
      </div>

      <div className="flex items-center justify-end border-t px-4 py-3">
        <Button size="sm" onClick={closeTriggerConfig}>
          Done
        </Button>
      </div>

      <TriggerSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={(type) => {
          let config = getTriggerDefaultConfig(type)
          if (type === 'webhook' && workflowStatus === 'published') {
            const array = new Uint8Array(32)
            crypto.getRandomValues(array)
            const secret = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
            config = {
              ...config,
              webhook_token: generateWebhookToken(),
              secret,
            } as WebhookTriggerConfig
          }
          setTrigger({ type, config })
        }}
      />
    </div>
  )
}
