'use client'

import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FlowControlStepConfig } from '@/lib/workflow-editor/step-defaults'

export default function FlowControlStepConfigForm({
  config,
  onUpdate,
}: {
  config: FlowControlStepConfig
  onUpdate: (config: FlowControlStepConfig) => void
}) {
  const conditions = config.conditions ?? []

  const addCondition = () => {
    onUpdate({
      ...config,
      conditions: [...conditions, { field: '', operator: 'equals', value: '' }],
    })
  }

  const updateCondition = (
    index: number,
    updates: Partial<{ field: string; operator: string; value: string }>
  ) => {
    const newConditions = [...conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    onUpdate({ ...config, conditions: newConditions })
  }

  const removeCondition = (index: number) => {
    onUpdate({ ...config, conditions: conditions.filter((_, i) => i !== index) })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor="control-type" className="text-sm font-medium">
          Tipo de controle
        </Label>
        <Select
          value={config.control_type}
          onValueChange={(v) =>
            onUpdate({ ...config, control_type: v as FlowControlStepConfig['control_type'] })
          }
        >
          <SelectTrigger id="control-type" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="path">Caminho condicional</SelectItem>
            <SelectItem value="loop">Loop</SelectItem>
            <SelectItem value="wait">Espera</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.control_type === 'path' && (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-medium">Condições</Label>
              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {conditions.length === 0 ? (
              <p className="text-muted-foreground text-xs">Nenhuma condição adicionada</p>
            ) : (
              <div className="flex flex-col gap-2">
                {conditions.map((condition, index) => (
                  <div key={index} className="flex flex-col gap-2 rounded border p-2">
                    <div className="flex gap-2">
                      <Input
                        value={condition.field}
                        onChange={(e) => updateCondition(index, { field: e.target.value })}
                        placeholder="Campo (ex: step_2.output)"
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeCondition(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={condition.operator}
                        onValueChange={(v) => updateCondition(index, { operator: v })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Igual</SelectItem>
                          <SelectItem value="contains">Contém</SelectItem>
                          <SelectItem value="gt">Maior que</SelectItem>
                          <SelectItem value="lt">Menor que</SelectItem>
                          <SelectItem value="exists">Existe</SelectItem>
                          <SelectItem value="not_exists">Não existe</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                        placeholder="Valor"
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="default-path" className="text-sm font-medium">
              Caminho padrão
            </Label>
            <Input
              id="default-path"
              value={config.default_path ?? ''}
              onChange={(e) => onUpdate({ ...config, default_path: e.target.value })}
              placeholder="Etapa a executar se nenhuma condição corresponder"
              className="mt-1"
            />
          </div>
        </>
      )}

      {config.control_type === 'loop' && (
        <>
          <div>
            <Label htmlFor="loop-source" className="text-sm font-medium">
              Fonte do loop
            </Label>
            <Input
              id="loop-source"
              value={config.loop_source ?? ''}
              onChange={(e) => onUpdate({ ...config, loop_source: e.target.value })}
              placeholder="e.g., {{step_2.output}}"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="loop-count" className="text-sm font-medium">
              Ou contagem do loop
            </Label>
            <Input
              id="loop-count"
              type="number"
              value={config.loop_count ?? ''}
              onChange={(e) =>
                onUpdate({ ...config, loop_count: parseInt(e.target.value) || undefined })
              }
              placeholder="Número de iterações"
              className="mt-1"
            />
          </div>
        </>
      )}

      {config.control_type === 'wait' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="wait-duration" className="text-sm font-medium">
              Duração
            </Label>
            <Input
              id="wait-duration"
              type="number"
              value={config.wait_duration ?? ''}
              onChange={(e) =>
                onUpdate({ ...config, wait_duration: parseInt(e.target.value) || undefined })
              }
              placeholder="Quantidade"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="wait-unit" className="text-sm font-medium">
              Unidade
            </Label>
            <Select
              value={config.wait_unit ?? 'seconds'}
              onValueChange={(v) =>
                onUpdate({ ...config, wait_unit: v as FlowControlStepConfig['wait_unit'] })
              }
            >
              <SelectTrigger id="wait-unit" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seconds">Segundos</SelectItem>
                <SelectItem value="minutes">Minutos</SelectItem>
                <SelectItem value="hours">Horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}
