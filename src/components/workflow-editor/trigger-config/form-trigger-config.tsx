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
import type { FormTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

export function FormTriggerConfigForm({
  config,
  onUpdate,
}: {
  config: FormTriggerConfig
  onUpdate: (config: FormTriggerConfig) => void
}) {
  const addField = () => {
    const newField = {
      id: crypto.randomUUID(),
      label: '',
      type: 'text' as const,
      required: false,
    }
    onUpdate({ ...config, fields: [...config.fields, newField] })
  }

  const removeField = (id: string) => {
    onUpdate({
      ...config,
      fields: config.fields.filter((field) => field.id !== id),
    })
  }

  const updateField = (id: string, updates: Partial<(typeof config.fields)[0]>) => {
    onUpdate({
      ...config,
      fields: config.fields.map((field) => (field.id === id ? { ...field, ...updates } : field)),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label>Campos do formulário</Label>
        <Button size="sm" variant="outline" onClick={addField}>
          <Plus className="mr-1 h-3 w-3" />
          Adicionar campo
        </Button>
      </div>

      {config.fields.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhum campo definido. Clique em &ldquo;Adicionar campo&rdquo;.
        </p>
      )}

      {config.fields.map((field) => (
        <div key={field.id} className="rounded-lg border p-3">
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-xs font-medium">Configuração do campo</Label>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => removeField(field.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs">Rótulo</Label>
              <Input
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                placeholder="Ex: Endereço de e-mail"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Tipo</Label>
              <Select
                value={field.type}
                onValueChange={(v) =>
                  updateField(field.id, {
                    type: v as FormTriggerConfig['fields'][0]['type'],
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="textarea">Área de texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="select">Seleção</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="file">Arquivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Obrigatório</Label>
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => updateField(field.id, { required: checked })}
              />
            </div>

            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={field.placeholder ?? ''}
                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                placeholder="Texto placeholder opcional"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      ))}

      <div>
        <Label>Texto do botão de envio</Label>
        <Input
          value={config.submit_button_text}
          onChange={(e) => onUpdate({ ...config, submit_button_text: e.target.value })}
          className="mt-1"
        />
      </div>

      <div>
        <Label>Mensagem de sucesso</Label>
        <Textarea
          value={config.success_message}
          onChange={(e) => onUpdate({ ...config, success_message: e.target.value })}
          rows={2}
          className="mt-1"
        />
      </div>
    </div>
  )
}
