'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { HumanInLoopStepConfig } from '@/lib/workflow-editor/step-defaults'

export default function HumanInLoopStepConfigForm({
  config,
  onUpdate,
}: {
  config: HumanInLoopStepConfig
  onUpdate: (config: HumanInLoopStepConfig) => void
}) {
  const showAssignee = config.assignee_type === 'specific'

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor="action-type" className="text-sm font-medium">
          Tipo de ação
        </Label>
        <Select
          value={config.action_type}
          onValueChange={(v) =>
            onUpdate({ ...config, action_type: v as HumanInLoopStepConfig['action_type'] })
          }
        >
          <SelectTrigger id="action-type" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="approval">Aprovação</SelectItem>
            <SelectItem value="input">Entrada</SelectItem>
            <SelectItem value="review">Revisão</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="assignee-type" className="text-sm font-medium">
          Tipo de responsável
        </Label>
        <Select
          value={config.assignee_type}
          onValueChange={(v) =>
            onUpdate({ ...config, assignee_type: v as HumanInLoopStepConfig['assignee_type'] })
          }
        >
          <SelectTrigger id="assignee-type" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anyone">Qualquer pessoa</SelectItem>
            <SelectItem value="specific">Pessoa específica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showAssignee && (
        <div>
          <Label htmlFor="assignee" className="text-sm font-medium">
            Responsável
          </Label>
          <Input
            id="assignee"
            value={config.assignee ?? ''}
            onChange={(e) => onUpdate({ ...config, assignee: e.target.value })}
            placeholder="E-mail ou ID do usuário"
            className="mt-1"
          />
        </div>
      )}

      <div>
        <Label htmlFor="prompt" className="text-sm font-medium">
          Prompt
        </Label>
        <Textarea
          id="prompt"
          value={config.prompt}
          onChange={(e) => onUpdate({ ...config, prompt: e.target.value })}
          placeholder="O que a pessoa deve fazer ou decidir?"
          rows={4}
          className="mt-1"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="include-context" className="text-sm font-medium">
          Incluir contexto da automação
        </Label>
        <Switch
          id="include-context"
          checked={config.include_context}
          onCheckedChange={(checked) => onUpdate({ ...config, include_context: checked })}
        />
      </div>

      <div>
        <Label htmlFor="timeout" className="text-sm font-medium">
          Timeout (minutos, opcional)
        </Label>
        <Input
          id="timeout"
          type="number"
          value={config.timeout_minutes ?? ''}
          onChange={(e) =>
            onUpdate({ ...config, timeout_minutes: parseInt(e.target.value) || undefined })
          }
          placeholder="Sem timeout"
          className="mt-1"
        />
      </div>
    </div>
  )
}
