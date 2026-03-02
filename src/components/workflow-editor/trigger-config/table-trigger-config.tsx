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
        <Label>ID da tabela</Label>
        <Input
          value={config.table_id}
          onChange={(e) => onUpdate({ ...config, table_id: e.target.value })}
          placeholder="ID da tabela"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Tipo de evento</Label>
        <Select
          value={config.event}
          onValueChange={(v) => onUpdate({ ...config, event: v as TableTriggerConfig['event'] })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="row_created">Linha criada</SelectItem>
            <SelectItem value="row_updated">Linha atualizada</SelectItem>
            <SelectItem value="row_deleted">Linha excluída</SelectItem>
            <SelectItem value="field_changed">Campo alterado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
