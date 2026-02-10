'use client'

import { Copy } from 'lucide-react'
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

export function WebhookTriggerConfigForm({
  config,
  onUpdate,
}: {
  config: WebhookTriggerConfig
  onUpdate: (config: WebhookTriggerConfig) => void
}) {
  const placeholderUrl = 'https://relay.example.com/webhook/wh_abc123xyz'

  const copyToClipboard = () => {
    navigator.clipboard.writeText(placeholderUrl)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Webhook URL</Label>
        <div className="mt-1 flex gap-2">
          <Input value={placeholderUrl} readOnly className="flex-1" />
          <Button size="icon" variant="outline" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          This URL will be generated when you save the workflow
        </p>
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
        <Label>Secret key (optional)</Label>
        <Input
          type="password"
          value={config.secret ?? ''}
          onChange={(e) => onUpdate({ ...config, secret: e.target.value })}
          placeholder="Enter a secret for request validation"
          className="mt-1"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Use this to validate incoming webhook requests
        </p>
      </div>

      <div>
        <Label>Response status code</Label>
        <Input
          type="number"
          min={100}
          max={599}
          value={config.response_status}
          onChange={(e) =>
            onUpdate({ ...config, response_status: parseInt(e.target.value) || 200 })
          }
          className="mt-1"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          HTTP status code to return after receiving the webhook
        </p>
      </div>
    </div>
  )
}
