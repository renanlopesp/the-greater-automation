'use client'

import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { HTTPStepConfig } from '@/lib/workflow-editor/step-defaults'

export default function HTTPStepConfigForm({
  config,
  onUpdate,
}: {
  config: HTTPStepConfig
  onUpdate: (config: HTTPStepConfig) => void
}) {
  const headers = config.headers ?? {}
  const headerEntries = Object.entries(headers)
  const showBody = ['POST', 'PUT', 'PATCH'].includes(config.method)

  const addHeader = () => {
    onUpdate({ ...config, headers: { ...headers, '': '' } })
  }

  const updateHeaderKey = (oldKey: string, newKey: string) => {
    const newHeaders = { ...headers }
    delete newHeaders[oldKey]
    newHeaders[newKey] = headers[oldKey] ?? ''
    onUpdate({ ...config, headers: newHeaders })
  }

  const updateHeaderValue = (key: string, value: string) => {
    onUpdate({ ...config, headers: { ...headers, [key]: value } })
  }

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers }
    delete newHeaders[key]
    onUpdate({ ...config, headers: newHeaders })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor="method" className="text-sm font-medium">
          Método
        </Label>
        <Select
          value={config.method}
          onValueChange={(v) => onUpdate({ ...config, method: v as HTTPStepConfig['method'] })}
        >
          <SelectTrigger id="method" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="url" className="text-sm font-medium">
          URL
        </Label>
        <Input
          id="url"
          value={config.url}
          onChange={(e) => onUpdate({ ...config, url: e.target.value })}
          placeholder="https://api.example.com/endpoint"
          className="mt-1"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-sm font-medium">Cabeçalhos</Label>
          <Button variant="outline" size="sm" onClick={addHeader}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {headerEntries.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nenhum cabeçalho adicionado</p>
        ) : (
          <div className="flex flex-col gap-2">
            {headerEntries.map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <Input
                  value={key}
                  onChange={(e) => updateHeaderKey(key, e.target.value)}
                  placeholder="Chave"
                  className="flex-1"
                />
                <Input
                  value={value}
                  onChange={(e) => updateHeaderValue(key, e.target.value)}
                  placeholder="Valor"
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => removeHeader(key)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBody && (
        <div>
          <Label htmlFor="body" className="text-sm font-medium">
            Body
          </Label>
          <Textarea
            id="body"
            value={config.body ?? ''}
            onChange={(e) => onUpdate({ ...config, body: e.target.value })}
            placeholder="JSON, dados de formulário ou corpo bruto"
            rows={4}
            className="mt-1"
          />
        </div>
      )}

      <div>
        <Label htmlFor="auth-type" className="text-sm font-medium">
          Autenticação
        </Label>
        <Select
          value={config.auth?.type ?? 'none'}
          onValueChange={(v) =>
            onUpdate({
              ...config,
              auth:
                v === 'none'
                  ? undefined
                  : { type: v as 'bearer' | 'basic' | 'api_key', value: config.auth?.value ?? '' },
            })
          }
        >
          <SelectTrigger id="auth-type" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            <SelectItem value="bearer">Bearer Token</SelectItem>
            <SelectItem value="basic">Basic Auth</SelectItem>
            <SelectItem value="api_key">API Key</SelectItem>
          </SelectContent>
        </Select>
        {config.auth && config.auth.type !== 'none' && (
          <Input
            value={config.auth.value}
            onChange={(e) =>
              onUpdate({ ...config, auth: { ...config.auth!, value: e.target.value } })
            }
            placeholder="Valor de autenticação"
            className="mt-2"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="timeout" className="text-sm font-medium">
            Timeout (segundos)
          </Label>
          <Input
            id="timeout"
            type="number"
            value={config.timeout_seconds}
            onChange={(e) =>
              onUpdate({ ...config, timeout_seconds: parseInt(e.target.value) || 30 })
            }
            placeholder="30"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="retry" className="text-sm font-medium">
            Tentativas de retry
          </Label>
          <Input
            id="retry"
            type="number"
            value={config.retry_count}
            onChange={(e) => onUpdate({ ...config, retry_count: parseInt(e.target.value) || 0 })}
            placeholder="0"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  )
}
