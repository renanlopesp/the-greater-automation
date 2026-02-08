'use client'

import { Plus, AlertTriangle } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getTriggerMeta } from '@/lib/workflow-editor/trigger-metadata'
import { getTriggerSummary, isTriggerConfigComplete } from '@/lib/workflow-editor/trigger-defaults'
import type { WorkflowTrigger } from '@/lib/workflow-editor/trigger-defaults'

interface TriggerBlockProps {
  trigger: WorkflowTrigger | null
  onAddTrigger: () => void
  onClickTrigger: () => void
}

export default function TriggerBlock({ trigger, onAddTrigger, onClickTrigger }: TriggerBlockProps) {
  if (!trigger) {
    return (
      <Card className="mx-auto max-w-[400px] cursor-pointer border-dashed" onClick={onAddTrigger}>
        <CardContent className="flex flex-col items-center gap-2 p-6">
          <Plus className="text-muted-foreground h-8 w-8" />
          <span className="text-muted-foreground text-sm font-medium">Add trigger</span>
        </CardContent>
      </Card>
    )
  }

  const meta = getTriggerMeta(trigger.type)
  const summary = getTriggerSummary(trigger)
  const isComplete = isTriggerConfigComplete(trigger)
  const IconComponent = meta
    ? (LucideIcons[meta.icon as keyof typeof LucideIcons] as React.ComponentType<{
        className?: string
      }>)
    : null

  return (
    <Card
      className="mx-auto max-w-[400px] cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClickTrigger}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
          {IconComponent && <IconComponent className="text-primary h-5 w-5" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{meta?.name ?? trigger.type}</span>
            {!isComplete && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
          </div>
          <span className="text-muted-foreground text-xs">{summary}</span>
        </div>
        <span className="text-muted-foreground text-xs tracking-wide uppercase">Trigger</span>
      </CardContent>
    </Card>
  )
}
