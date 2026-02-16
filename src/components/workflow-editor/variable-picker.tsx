'use client'

import { Braces } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { getTriggerMeta } from '@/lib/workflow-editor/trigger-metadata'
import { getStepMeta } from '@/lib/workflow-editor/step-metadata'
import { cn } from '@/lib/utils'
import { DynamicIcon } from '@/lib/workflow-editor/icon-registry'

interface VariablePickerProps {
  currentStepPosition: number
  onInsert: (variable: string) => void
}

export function VariablePicker({ currentStepPosition, onInsert }: VariablePickerProps) {
  const trigger = useWorkflowEditorStore((state) => state.trigger)
  const steps = useWorkflowEditorStore((state) => state.steps)

  // Get steps before current position
  const availableSteps = steps.filter((step) => step.position < currentStepPosition)

  const handleVariableClick = (variable: string) => {
    onInsert(variable)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Insert variable"
        >
          <Braces className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b p-3">
          <h4 className="text-sm font-semibold">Available Variables</h4>
          <p className="text-muted-foreground text-xs">Click to insert a variable reference</p>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {/* Trigger output */}
            {trigger && (
              <VariableRow
                icon={getTriggerMeta(trigger.type)?.icon || 'Play'}
                name={getTriggerMeta(trigger.type)?.name || 'Trigger'}
                variable="trigger.output"
                onClick={() => handleVariableClick('trigger.output')}
              />
            )}

            {/* Step outputs */}
            {availableSteps.map((step) => {
              const stepMeta = getStepMeta(step.type)
              const stepNum = step.position + 1
              const variable = `step_${stepNum}.output`

              return (
                <VariableRow
                  key={step.id}
                  icon={stepMeta?.icon || 'Box'}
                  name={step.name || stepMeta?.name || `Step ${stepNum}`}
                  variable={variable}
                  onClick={() => handleVariableClick(variable)}
                />
              )
            })}

            {/* Empty state */}
            {!trigger && availableSteps.length === 0 && (
              <div className="text-muted-foreground p-4 text-center text-sm">
                No variables available yet
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

interface VariableRowProps {
  icon: string
  name: string
  variable: string
  onClick: () => void
}

function VariableRow({ icon, name, variable, onClick }: VariableRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
        'hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
        <DynamicIcon name={icon} fallback="Box" className="h-4 w-4" />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="text-muted-foreground truncate font-mono text-xs">{`{{${variable}}}`}</div>
      </div>
    </button>
  )
}
