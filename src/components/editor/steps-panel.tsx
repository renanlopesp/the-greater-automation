'use client'

import { useState } from 'react'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import StepCard from '@/components/workflow-editor/step-card'
import ConnectorLine from '@/components/workflow-editor/connector-line'
import AddStepButton from '@/components/workflow-editor/add-step-button'
import StepSelector from '@/components/workflow-editor/step-selector'
import { getStepDefaultConfig } from '@/lib/workflow-editor/step-defaults'
import { getStepMeta } from '@/lib/workflow-editor/step-metadata'
import type { Database } from '@/lib/supabase/database.types'

type StepType = Database['public']['Enums']['step_type']

export default function StepsPanel() {
  const { steps, selectedStepId, addStep, selectStep, reorderSteps } = useWorkflowEditorStore()
  const [stepSelectorOpen, setStepSelectorOpen] = useState(false)

  const sortedSteps = [...steps].sort((a, b) => a.position - b.position)

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
      {sortedSteps.map((step, index) => (
        <div key={step.id} className="flex w-full flex-col items-center">
          <StepCard
            step={step}
            // In prod, the trigger occupies "1", so steps start at 2.
            stepNumber={index + 2}
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

      <StepSelector
        open={stepSelectorOpen}
        onOpenChange={setStepSelectorOpen}
        onSelect={handleStepSelect}
      />
    </>
  )
}
