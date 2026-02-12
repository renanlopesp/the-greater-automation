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
import type { WebhookTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'
import { buildWebhookUrl } from '@/lib/workflow-editor/webhook-executor'

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
        <Label>Webhook URL</Label>
        {webhookUrl ? (
          <div className="mt-1 flex gap-2">
            <Input value={webhookUrl} readOnly className="flex-1" />
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(webhookUrl, 'url')}
            >
              {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">
            Publish the workflow to generate the webhook URL
          </p>
        )}
      </div>

      <div>
        <Label>Method</Label>
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
        <Label>Secret key</Label>
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
                title={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(config.secret!, 'secret')}
                title="Copy secret"
              >
                {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={handleRegenerateSecret}
                title="Generate new secret"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Send this value in the <code className="bg-muted rounded px-1">x-webhook-secret</code>{' '}
              header to authenticate requests
            </p>
          </>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">
            Publish the workflow to generate a secret key
          </p>
        )}
      </div>

      <div>
        <Label>Response status code</Label>
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
          HTTP status code to return after receiving the webhook
        </p>
      </div>
    </div>
  )
}
