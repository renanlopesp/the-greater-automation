'use client'

import { RefreshCw } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { getTriggerMeta } from '@/lib/workflow-editor/trigger-metadata'
import { TriggerConfigRouter } from '@/components/workflow-editor/trigger-config'
import TriggerSelector from '@/components/workflow-editor/trigger-selector'
import { getTriggerDefaultConfig } from '@/lib/workflow-editor/trigger-defaults'
import { useState } from 'react'

export default function TriggerConfigPanel() {
  const { trigger, setTrigger, closeTriggerConfig } = useWorkflowEditorStore()
  const [selectorOpen, setSelectorOpen] = useState(false)

  if (!trigger) return null

  const meta = getTriggerMeta(trigger.type)
  const IconComponent = meta
    ? (LucideIcons[meta.icon as keyof typeof LucideIcons] as React.ComponentType<{
        className?: string
      }>)
    : null

  return (
    <div className="flex h-full w-full flex-col border-l">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
          {IconComponent && <IconComponent className="text-primary h-4 w-4" />}
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

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          <p className="text-muted-foreground text-sm">{meta?.description}</p>
          <Separator />
          <TriggerConfigRouter
            trigger={trigger}
            onUpdate={(config) => setTrigger({ ...trigger, config })}
          />
        </div>
      </ScrollArea>

      <div className="flex items-center justify-end border-t px-4 py-3">
        <Button size="sm" onClick={closeTriggerConfig}>
          Done
        </Button>
      </div>

      <TriggerSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={(type) => {
          setTrigger({ type, config: getTriggerDefaultConfig(type) })
        }}
      />
    </div>
  )
}
