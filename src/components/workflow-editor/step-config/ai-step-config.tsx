'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AIStepConfig } from '@/lib/workflow-editor/step-defaults'

export default function AIStepConfigForm({
  config,
  onUpdate,
}: {
  config: AIStepConfig
  onUpdate: (config: AIStepConfig) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor="ai-action" className="text-sm font-medium">
          Ação de IA
        </Label>
        <Select
          value={config.ai_action}
          onValueChange={(v) => onUpdate({ ...config, ai_action: v as AIStepConfig['ai_action'] })}
        >
          <SelectTrigger id="ai-action" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="summarize">Resumir</SelectItem>
            <SelectItem value="classify">Classificar</SelectItem>
            <SelectItem value="extract">Extrair</SelectItem>
            <SelectItem value="generate">Gerar</SelectItem>
            <SelectItem value="transform">Transformar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="prompt-template" className="text-sm font-medium">
          Modelo de prompt
        </Label>
        <Textarea
          id="prompt-template"
          value={config.prompt_template}
          onChange={(e) => onUpdate({ ...config, prompt_template: e.target.value })}
          placeholder="Digite seu prompt..."
          rows={4}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="output-format" className="text-sm font-medium">
          Formato de saída
        </Label>
        <Select
          value={config.output_format}
          onValueChange={(v) =>
            onUpdate({ ...config, output_format: v as AIStepConfig['output_format'] })
          }
        >
          <SelectTrigger id="output-format" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Texto</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="temperature" className="text-sm font-medium">
          Temperature: {config.temperature.toFixed(1)}
        </Label>
        <Slider
          id="temperature"
          min={0}
          max={1}
          step={0.1}
          value={[config.temperature]}
          onValueChange={(v) => onUpdate({ ...config, temperature: v[0] })}
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="max-tokens" className="text-sm font-medium">
          Max tokens
        </Label>
        <Input
          id="max-tokens"
          type="number"
          value={config.max_tokens}
          onChange={(e) => onUpdate({ ...config, max_tokens: parseInt(e.target.value) || 1000 })}
          placeholder="1000"
          className="mt-1"
        />
      </div>
    </div>
  )
}
