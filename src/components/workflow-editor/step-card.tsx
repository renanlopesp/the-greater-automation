'use client'

import { AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
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
  const IconComponent = meta
    ? (LucideIcons[meta.icon as keyof typeof LucideIcons] as React.ComponentType<{
        className?: string
      }>)
    : null

  return (
    <Card
      className={cn(
        'group mx-auto max-w-[400px] cursor-pointer transition-all hover:shadow-sm',
        isSelected && 'ring-primary ring-2'
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold">
          {stepNumber}
        </div>
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
          {IconComponent && <IconComponent className="text-primary h-5 w-5" />}
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
