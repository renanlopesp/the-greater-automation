'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UtilityStepConfig } from '@/lib/workflow-editor/step-defaults'

export default function UtilityStepConfigForm({
  config,
  onUpdate,
}: {
  config: UtilityStepConfig
  onUpdate: (config: UtilityStepConfig) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor="utility-type" className="text-sm font-medium">
          Tipo de utilidade
        </Label>
        <Select
          value={config.utility_type}
          onValueChange={(v) =>
            onUpdate({ ...config, utility_type: v as UtilityStepConfig['utility_type'] })
          }
        >
          <SelectTrigger id="utility-type" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="send_telegram">Enviar Telegram</SelectItem>
            <SelectItem value="format">Formatar dados</SelectItem>
            <SelectItem value="parse_json">Parse JSON</SelectItem>
            <SelectItem value="parse_csv">Parse CSV</SelectItem>
            <SelectItem value="merge">Mesclar dados</SelectItem>
            <SelectItem value="filter">Filtrar array</SelectItem>
            <SelectItem value="map">Mapear array</SelectItem>
            <SelectItem value="math">Operação matemática</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Send Telegram fields */}
      {config.utility_type === 'send_telegram' && (
        <>
          <div>
            <Label htmlFor="telegram-template" className="text-sm font-medium">
              Modelo de mensagem
            </Label>
            <Textarea
              id="telegram-template"
              value={config.telegram_template ?? ''}
              onChange={(e) => onUpdate({ ...config, telegram_template: e.target.value })}
              placeholder="e.g., {{step_3.output.content}}"
              rows={4}
              className="mt-1"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Use {'{{step_N.output.content}}'} to reference output from previous steps.
            </p>
          </div>
          <div>
            <Label htmlFor="telegram-parse-mode" className="text-sm font-medium">
              Modo de parse
            </Label>
            <Select
              value={config.telegram_parse_mode ?? 'Markdown'}
              onValueChange={(v) =>
                onUpdate({
                  ...config,
                  telegram_parse_mode: v as UtilityStepConfig['telegram_parse_mode'],
                })
              }
            >
              <SelectTrigger id="telegram-parse-mode" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Markdown">Markdown</SelectItem>
                <SelectItem value="MarkdownV2">Markdown V2</SelectItem>
                <SelectItem value="HTML">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Non-telegram types show input source */}
      {config.utility_type !== 'send_telegram' && (
        <div>
          <Label htmlFor="input-source" className="text-sm font-medium">
            Fonte de entrada
          </Label>
          <Input
            id="input-source"
            value={config.input_source ?? ''}
            onChange={(e) => onUpdate({ ...config, input_source: e.target.value })}
            placeholder="e.g., {{step_2.output}}"
            className="mt-1"
          />
        </div>
      )}

      {config.utility_type === 'format' && (
        <div>
          <Label htmlFor="format-template" className="text-sm font-medium">
            Modelo de formato
          </Label>
          <Textarea
            id="format-template"
            value={config.format_template ?? ''}
            onChange={(e) => onUpdate({ ...config, format_template: e.target.value })}
            placeholder="e.g., Hello {{name}}, your score is {{score}}"
            rows={4}
            className="mt-1"
          />
        </div>
      )}

      {config.utility_type === 'filter' && (
        <div>
          <Label htmlFor="filter-condition" className="text-sm font-medium">
            Condição de filtro
          </Label>
          <Input
            id="filter-condition"
            value={config.filter_condition ?? ''}
            onChange={(e) => onUpdate({ ...config, filter_condition: e.target.value })}
            placeholder="e.g., item.status === 'active'"
            className="mt-1"
          />
        </div>
      )}

      {config.utility_type === 'math' && (
        <div>
          <Label htmlFor="math-expression" className="text-sm font-medium">
            Expressão matemática
          </Label>
          <Input
            id="math-expression"
            value={config.math_expression ?? ''}
            onChange={(e) => onUpdate({ ...config, math_expression: e.target.value })}
            placeholder="e.g., (value * 1.1) + 5"
            className="mt-1"
          />
        </div>
      )}
    </div>
  )
}
