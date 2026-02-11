'use client'

import React from 'react'
import * as LucideIcons from 'lucide-react'
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import TriggerSelector from '@/components/workflow-editor/trigger-selector'
import { TriggerConfigRouter } from '@/components/workflow-editor/trigger-config'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { getTriggerDefaultConfig } from '@/lib/workflow-editor/trigger-defaults'
import { getTriggerMeta } from '@/lib/workflow-editor/trigger-metadata'

export default function TriggerPanel() {
  const { trigger, setTrigger } = useWorkflowEditorStore()

  const [selectorOpen, setSelectorOpen] = React.useState(false)
  const [expanded, setExpanded] = React.useState(false)

  const meta = getTriggerMeta(trigger?.type ?? 'manual')
  const IconComponent = meta
    ? (LucideIcons[meta.icon as keyof typeof LucideIcons] as React.ComponentType<{
        className?: string
      }>)
    : null

  const title =
    trigger?.type === 'manual' || !trigger ? 'Start run manually' : (meta?.name ?? trigger.type)

  return (
    <>
      <Card className="w-full max-w-[520px] gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
        <div className="bg-muted/20 text-muted-foreground border-b px-5 py-3 text-sm font-medium">
          Add a step to start a run
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="hover:bg-muted/20 flex w-full items-center gap-3 px-5 py-4 text-left"
        >
          <div className="text-muted-foreground w-6 shrink-0 text-center text-sm">1</div>
          <div className="border-primary/25 bg-background flex h-9 w-9 items-center justify-center rounded-lg border">
            {IconComponent && <IconComponent className="text-primary h-4 w-4" />}
          </div>
          <div className="flex-1 truncate text-sm font-medium">{title}</div>
          {expanded ? (
            <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
          )}
        </button>

        {expanded && trigger && (
          <>
            <Separator />
            <div className="flex flex-col gap-4 px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">{meta?.description}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectorOpen(true)
                  }}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Change type
                </Button>
              </div>
              <Separator />
              <TriggerConfigRouter
                trigger={trigger}
                onUpdate={(config) => setTrigger({ ...trigger, config })}
              />
            </div>
          </>
        )}
      </Card>

      <TriggerSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={(type) => {
          setTrigger({ type, config: getTriggerDefaultConfig(type) })
        }}
      />
    </>
  )
}
