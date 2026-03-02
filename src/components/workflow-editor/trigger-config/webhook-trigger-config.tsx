'use client'

import { useState } from 'react'
import { Copy, Eye, EyeOff, RefreshCw, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { WebhookTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'
import { buildWebhookUrl } from '@/lib/workflow-editor/webhook-utils'

const STATUS_CODE_OPTIONS = [
  { value: '200', label: '200 OK' },
  { value: '201', label: '201 Created' },
  { value: '202', label: '202 Accepted' },
  { value: '204', label: '204 No Content' },
] as const

export function WebhookTriggerConfigForm({
  config,
  onUpdate,
}: {
  config: WebhookTriggerConfig
  onUpdate: (config: WebhookTriggerConfig) => void
}) {
  const webhookUrl = config.webhook_token ? buildWebhookUrl(config.webhook_token) : ''
  const [showSecret, setShowSecret] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  const copyToClipboard = (text: string, type: 'url' | 'secret') => {
    navigator.clipboard.writeText(text)
    if (type === 'url') {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } else {
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    }
  }

  const handleRegenerateSecret = () => {
    // Generate a 64-char hex string client-side for immediate display
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const newSecret = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
    onUpdate({ ...config, secret: newSecret, encrypted_secret: undefined })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>URL do Webhook</Label>
        {webhookUrl ? (
          <div className="mt-1 flex gap-2">
            <Input value={webhookUrl} readOnly className="flex-1" />
            <Button
              size="icon"
              variant="outline"
              title="Copiar URL"
              onClick={() => copyToClipboard(webhookUrl, 'url')}
            >
              {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">
            Publique a automação para gerar a URL do webhook
          </p>
        )}
      </div>

      <div>
        <Label>Método</Label>
        <Select
          value={config.method}
          onValueChange={(v) =>
            onUpdate({ ...config, method: v as WebhookTriggerConfig['method'] })
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Chave secreta</Label>
        {config.secret ? (
          <>
            <div className="mt-1 flex gap-2">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={config.secret}
                readOnly
                className="flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowSecret(!showSecret)}
                title={showSecret ? 'Ocultar segredo' : 'Mostrar segredo'}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(config.secret!, 'secret')}
                title="Copiar segredo"
              >
                {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={handleRegenerateSecret}
                title="Gerar nova chave"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Envie este valor no header{' '}
              <code className="bg-muted rounded px-1">x-webhook-secret</code> para autenticar
              requisições
            </p>
          </>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">
            Publique a automação para gerar uma chave secreta
          </p>
        )}
      </div>

      <div>
        <Label>Código de status da resposta</Label>
        <Select
          value={String(config.response_status)}
          onValueChange={(v) => onUpdate({ ...config, response_status: parseInt(v) })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_CODE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground mt-1 text-xs">
          Código de status HTTP retornado após receber o webhook
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="response-mode">Incluir todas as etapas na resposta</Label>
          <p className="text-muted-foreground text-xs">
            {config.response_mode === 'all_steps'
              ? 'Retorna o resultado de cada etapa'
              : 'Retorna apenas o resultado da etapa final'}
          </p>
        </div>
        <Switch
          id="response-mode"
          checked={config.response_mode === 'all_steps'}
          onCheckedChange={(checked) =>
            onUpdate({ ...config, response_mode: checked ? 'all_steps' : 'final' })
          }
        />
      </div>
    </div>
  )
}
