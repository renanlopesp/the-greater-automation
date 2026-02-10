'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ManualTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

export function ManualTriggerConfigForm({
  config,
  onUpdate,
}: {
  config: ManualTriggerConfig
  onUpdate: (config: ManualTriggerConfig) => void
}) {
  const addInput = () => {
    const newInput = {
      id: crypto.randomUUID(),
      name: '',
      type: 'text' as const,
      required: false,
    }
    onUpdate({ ...config, run_inputs: [...config.run_inputs, newInput] })
  }

  const removeInput = (id: string) => {
    onUpdate({
      ...config,
      run_inputs: config.run_inputs.filter((input) => input.id !== id),
    })
  }

  const updateInput = (id: string, updates: Partial<(typeof config.run_inputs)[0]>) => {
    onUpdate({
      ...config,
      run_inputs: config.run_inputs.map((input) =>
        input.id === id ? { ...input, ...updates } : input
      ),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label>Run inputs</Label>
        <Button size="sm" variant="outline" onClick={addInput}>
          <Plus className="mr-1 h-3 w-3" />
          Add input
        </Button>
      </div>

      {config.run_inputs.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No inputs defined. Click &ldquo;Add input&rdquo; to create one.
        </p>
      )}

      {config.run_inputs.map((input) => (
        <div key={input.id} className="rounded-lg border p-3">
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-xs font-medium">Input configuration</Label>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => removeInput(input.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={input.name}
                onChange={(e) => updateInput(input.id, { name: e.target.value })}
                placeholder="e.g. user_email"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={input.type}
                onValueChange={(v) =>
                  updateInput(input.id, {
                    type: v as ManualTriggerConfig['run_inputs'][0]['type'],
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Required</Label>
              <Switch
                checked={input.required}
                onCheckedChange={(checked) => updateInput(input.id, { required: checked })}
              />
            </div>

            <div>
              <Label className="text-xs">Default value</Label>
              <Input
                value={input.default_value ?? ''}
                onChange={(e) => updateInput(input.id, { default_value: e.target.value })}
                placeholder="Optional default value"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={input.description ?? ''}
                onChange={(e) => updateInput(input.id, { description: e.target.value })}
                placeholder="Optional description"
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
