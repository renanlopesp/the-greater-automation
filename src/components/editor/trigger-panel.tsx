'use client'

import React from 'react'
import * as LucideIcons from 'lucide-react'
import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import TriggerSelector from '@/components/workflow-editor/trigger-selector'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import {
  getTriggerDefaultConfig,
  isTriggerConfigComplete,
} from '@/lib/workflow-editor/trigger-defaults'
import { getTriggerMeta } from '@/lib/workflow-editor/trigger-metadata'

export default function TriggerPanel() {
  const { trigger, setTrigger, isTriggerConfigOpen, openTriggerConfig } = useWorkflowEditorStore()

  const [selectorOpen, setSelectorOpen] = React.useState(false)

  const meta = getTriggerMeta(trigger?.type ?? 'manual')
  const IconComponent = meta
    ? (LucideIcons[meta.icon as keyof typeof LucideIcons] as React.ComponentType<{
        className?: string
      }>)
    : null

  const title =
    trigger?.type === 'manual' || !trigger ? 'Start run manually' : (meta?.name ?? trigger.type)

  const isComplete = trigger ? isTriggerConfigComplete(trigger) : true

  const handleClick = () => {
    if (!trigger) {
      setSelectorOpen(true)
    } else {
      openTriggerConfig()
    }
  }

  return (
    <>
      <Card
        className={`w-full max-w-[520px] gap-0 overflow-hidden rounded-lg py-0 shadow-sm ${isTriggerConfigOpen ? 'ring-primary ring-2' : ''}`}
      >
        <div className="bg-muted/20 text-muted-foreground border-b px-5 py-3 text-sm font-medium">
          Add a step to start a run
        </div>
        <button
          type="button"
          onClick={handleClick}
          className="hover:bg-muted/20 flex w-full items-center gap-3 px-5 py-4 text-left"
        >
          <div className="text-muted-foreground w-6 shrink-0 text-center text-sm">1</div>
          <div className="border-primary/25 bg-background flex h-9 w-9 items-center justify-center rounded-lg border">
            {IconComponent && <IconComponent className="text-primary h-4 w-4" />}
          </div>
          <div className="flex-1 truncate text-sm font-medium">{title}</div>
          {!isComplete && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-500" />}
        </button>
      </Card>

      <TriggerSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={(type) => {
          setTrigger({ type, config: getTriggerDefaultConfig(type) })
          openTriggerConfig()
        }}
      />
    </>
  )
}
