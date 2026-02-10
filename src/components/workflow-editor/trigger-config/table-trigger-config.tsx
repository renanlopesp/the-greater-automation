'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TableTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

export function TableTriggerConfigForm({
  config,
  onUpdate,
}: {
  config: TableTriggerConfig
  onUpdate: (config: TableTriggerConfig) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Table ID</Label>
        <Input
          value={config.table_id}
          onChange={(e) => onUpdate({ ...config, table_id: e.target.value })}
          placeholder="Enter table ID"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Event type</Label>
        <Select
          value={config.event}
          onValueChange={(v) => onUpdate({ ...config, event: v as TableTriggerConfig['event'] })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="row_created">Row created</SelectItem>
            <SelectItem value="row_updated">Row updated</SelectItem>
            <SelectItem value="row_deleted">Row deleted</SelectItem>
            <SelectItem value="field_changed">Field changed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
