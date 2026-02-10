'use client'

import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { AppStepConfig } from '@/lib/workflow-editor/step-defaults'

export default function AppStepConfigForm({
  config,
  onUpdate,
}: {
  config: AppStepConfig
  onUpdate: (config: AppStepConfig) => void
}) {
  const inputs = config.inputs ?? {}
  const inputEntries = Object.entries(inputs)

  const addInput = () => {
    onUpdate({ ...config, inputs: { ...inputs, '': '' } })
  }

  const updateInputKey = (oldKey: string, newKey: string) => {
    const newInputs = { ...inputs }
    delete newInputs[oldKey]
    newInputs[newKey] = inputs[oldKey] ?? ''
    onUpdate({ ...config, inputs: newInputs })
  }

  const updateInputValue = (key: string, value: unknown) => {
    onUpdate({ ...config, inputs: { ...inputs, [key]: value } })
  }

  const removeInput = (key: string) => {
    const newInputs = { ...inputs }
    delete newInputs[key]
    onUpdate({ ...config, inputs: newInputs })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor="app-id" className="text-sm font-medium">
          App ID
        </Label>
        <Input
          id="app-id"
          value={config.app_id}
          onChange={(e) => onUpdate({ ...config, app_id: e.target.value })}
          placeholder="e.g., slack, github, email"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="action" className="text-sm font-medium">
          Action
        </Label>
        <Input
          id="action"
          value={config.action}
          onChange={(e) => onUpdate({ ...config, action: e.target.value })}
          placeholder="e.g., send_message, create_issue"
          className="mt-1"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-sm font-medium">Inputs</Label>
          <Button variant="outline" size="sm" onClick={addInput}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {inputEntries.length === 0 ? (
          <p className="text-muted-foreground text-xs">No inputs added</p>
        ) : (
          <div className="flex flex-col gap-2">
            {inputEntries.map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <Input
                  value={key}
                  onChange={(e) => updateInputKey(key, e.target.value)}
                  placeholder="Key"
                  className="flex-1"
                />
                <Input
                  value={String(value)}
                  onChange={(e) => updateInputValue(key, e.target.value)}
                  placeholder="Value"
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => removeInput(key)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
