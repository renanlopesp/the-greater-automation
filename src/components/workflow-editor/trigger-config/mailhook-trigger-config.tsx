'use client'

import { Copy } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { MailhookTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

export function MailhookTriggerConfigForm({
  config,
  onUpdate,
}: {
  config: MailhookTriggerConfig
  onUpdate: (config: MailhookTriggerConfig) => void
}) {
  const placeholderEmail = 'workflow-abc123@relay.example.com'

  const copyToClipboard = () => {
    navigator.clipboard.writeText(placeholderEmail)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Endereço de e-mail</Label>
        <div className="mt-1 flex gap-2">
          <Input value={placeholderEmail} readOnly className="flex-1" />
          <Button size="icon" variant="outline" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Este endereço será gerado quando você salvar a automação
        </p>
      </div>

      <div>
        <Label>Remetentes permitidos (opcional)</Label>
        <Input
          value={config.allowed_senders?.join(', ') ?? ''}
          onChange={(e) =>
            onUpdate({
              ...config,
              allowed_senders: e.target.value
                ? e.target.value.split(',').map((s) => s.trim())
                : undefined,
            })
          }
          placeholder="user@example.com, other@example.com"
          className="mt-1"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Lista de e-mails permitidos separados por vírgula
        </p>
      </div>

      <div>
        <Label>Filtro de assunto (opcional)</Label>
        <Input
          value={config.subject_filter ?? ''}
          onChange={(e) => onUpdate({ ...config, subject_filter: e.target.value })}
          placeholder="e.g. [URGENT]"
          className="mt-1"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Acionar apenas se o assunto contiver este texto
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label>Salvar anexos</Label>
          <p className="text-muted-foreground text-xs">
            Armazenar anexos de e-mail para uso na automação
          </p>
        </div>
        <Switch
          checked={config.save_attachments}
          onCheckedChange={(checked) => onUpdate({ ...config, save_attachments: checked })}
        />
      </div>
    </div>
  )
}
