'use client'

import { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import TriggerBlock from '@/components/workflow-editor/trigger-block'
import StepCard from '@/components/workflow-editor/step-card'
import ConnectorLine from '@/components/workflow-editor/connector-line'
import AddStepButton from '@/components/workflow-editor/add-step-button'
import TriggerSelector from '@/components/workflow-editor/trigger-selector'
import StepSelector from '@/components/workflow-editor/step-selector'
import { getTriggerDefaultConfig } from '@/lib/workflow-editor/trigger-defaults'
import { getStepDefaultConfig } from '@/lib/workflow-editor/step-defaults'
import { getStepMeta } from '@/lib/workflow-editor/step-metadata'
import type { Database } from '@/lib/supabase/database.types'

type StepType = Database['public']['Enums']['step_type']

export default function StepCanvas() {
  const trigger = useWorkflowEditorStore((s) => s.trigger)
  const steps = useWorkflowEditorStore((s) => s.steps)
  const selectedStepId = useWorkflowEditorStore((s) => s.selectedStepId)
  const setTrigger = useWorkflowEditorStore((s) => s.setTrigger)
  const addStep = useWorkflowEditorStore((s) => s.addStep)
  const selectStep = useWorkflowEditorStore((s) => s.selectStep)
  const reorderSteps = useWorkflowEditorStore((s) => s.reorderSteps)

  const [triggerSelectorOpen, setTriggerSelectorOpen] = useState(false)
  const [stepSelectorOpen, setStepSelectorOpen] = useState(false)

  const sortedSteps = useMemo(() => [...steps].sort((a, b) => a.position - b.position), [steps])
  const showConnectorAfterTrigger = trigger !== null || steps.length > 0

  function handleTriggerSelect(type: Parameters<typeof getTriggerDefaultConfig>[0]) {
    setTrigger({ type, config: getTriggerDefaultConfig(type) })
  }

  function handleStepSelect(type: StepType) {
    const meta = getStepMeta(type)
    addStep({
      id: crypto.randomUUID(),
      type,
      name: meta?.name ?? type,
      config: getStepDefaultConfig(type),
    })
  }

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center gap-0 py-8">
          <TriggerBlock
            trigger={trigger}
            onAddTrigger={() => setTriggerSelectorOpen(true)}
            onClickTrigger={() => setTriggerSelectorOpen(true)}
          />

          {showConnectorAfterTrigger && <ConnectorLine />}

          {sortedSteps.map((step, index) => (
            <div key={step.id} className="flex w-full flex-col items-center">
              <StepCard
                step={step}
                stepNumber={index + 1}
                isSelected={selectedStepId === step.id}
                onClick={() => selectStep(step.id)}
                isFirst={index === 0}
                isLast={index === sortedSteps.length - 1}
                onMoveUp={() => reorderSteps(index, index - 1)}
                onMoveDown={() => reorderSteps(index, index + 1)}
              />
              <ConnectorLine />
            </div>
          ))}

          <AddStepButton onClick={() => setStepSelectorOpen(true)} />
        </div>
      </ScrollArea>

      <TriggerSelector
        open={triggerSelectorOpen}
        onOpenChange={setTriggerSelectorOpen}
        onSelect={handleTriggerSelect}
      />
      <StepSelector
        open={stepSelectorOpen}
        onOpenChange={setStepSelectorOpen}
        onSelect={handleStepSelect}
      />
    </>
  )
}
