'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface Workflow {
  id: string
  name: string
  emoji: string | null
}

interface SkillSelectorProps {
  workflows: Workflow[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export default function SkillSelector({ workflows, selectedIds, onChange }: SkillSelectorProps) {
  function handleToggle(workflowId: string, checked: boolean) {
    if (checked) {
      onChange([...selectedIds, workflowId])
    } else {
      onChange(selectedIds.filter((id) => id !== workflowId))
    }
  }

  if (workflows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No workflows available. Create a workflow first to assign it as a skill.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {workflows.map((workflow) => (
        <div key={workflow.id} className="flex items-center gap-3">
          <Checkbox
            id={`skill-${workflow.id}`}
            checked={selectedIds.includes(workflow.id)}
            onCheckedChange={(checked) => handleToggle(workflow.id, checked === true)}
          />
          <Label
            htmlFor={`skill-${workflow.id}`}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <span>{workflow.emoji ?? '\uD83D\uDCCB'}</span>
            <span>{workflow.name}</span>
          </Label>
        </div>
      ))}
    </div>
  )
}
