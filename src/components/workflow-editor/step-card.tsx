'use client'

import { AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import { DynamicIcon } from '@/lib/workflow-editor/icon-registry'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getStepMeta } from '@/lib/workflow-editor/step-metadata'
import { isStepConfigComplete } from '@/lib/workflow-editor/step-defaults'
import type { WorkflowStep } from '@/lib/workflow-editor/step-defaults'

interface StepCardProps {
  step: WorkflowStep
  stepNumber: number
  isSelected: boolean
  onClick: () => void
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}

export default function StepCard({
  step,
  stepNumber,
  isSelected,
  onClick,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: StepCardProps) {
  const meta = getStepMeta(step.type)
  const complete = isStepConfigComplete(step)

  return (
    <Card
      className={cn(
        'group hover:bg-muted/20 w-full max-w-[520px] cursor-pointer gap-0 rounded-lg py-0 shadow-sm transition-colors',
        isSelected && 'ring-primary ring-2'
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 px-5 py-4">
        <div className="text-muted-foreground w-6 shrink-0 text-center text-sm">{stepNumber}</div>
        <div className="border-primary/25 bg-background flex h-9 w-9 items-center justify-center rounded-lg border">
          {meta && <DynamicIcon name={meta.icon} className="text-primary h-4 w-4" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{step.name}</span>
            {!complete && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
          </div>
        </div>
        <div className="flex flex-col opacity-0 transition-opacity group-hover:opacity-100">
          {!isFirst && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onMoveUp()
              }}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
          {!isLast && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onMoveDown()
              }}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
