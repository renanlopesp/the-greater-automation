'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, Loader2 } from 'lucide-react'

type Provider = 'openai' | 'anthropic' | 'openrouter' | 'custom'

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-5.2',
  anthropic: 'claude-sonnet-4-20250514',
  openrouter: 'openai/gpt-5.2',
  custom: '',
}

const PERMISSIONS = [
  { key: 'webSearch', label: 'Web Search', description: 'Allow searching the web' },
  { key: 'fileSystem', label: 'File System', description: 'Read and write files' },
  { key: 'exec', label: 'Execute Commands', description: 'Run shell commands' },
  { key: 'browser', label: 'Browser', description: 'Control a headless browser' },
  { key: 'messaging', label: 'Messaging', description: 'Send messages and notifications' },
] as const

type PermissionKey = (typeof PERMISSIONS)[number]['key']

type LLMConfig = {
  provider: Provider
  apiKey: string
  model: string
  baseUrl: string
}

type Permissions = Record<PermissionKey, boolean>

type ProgressStep = {
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
}

const STEPS = ['LLM Configuration', 'Permissions', 'Review & Provision'] as const

export default function SnewclawSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const [llm, setLlm] = useState<LLMConfig>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-5.2',
    baseUrl: '',
  })

  const [permissions, setPermissions] = useState<Permissions>({
    webSearch: false,
    fileSystem: false,
    exec: false,
    browser: false,
    messaging: false,
  })

  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [provisionError, setProvisionError] = useState<string | null>(null)

  function handleProviderChange(value: Provider) {
    setLlm((prev) => ({ ...prev, provider: value, model: DEFAULT_MODELS[value] }))
  }

  function togglePermission(key: PermissionKey) {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleProvision() {
    setIsProvisioning(true)
    setProvisionError(null)
    setProgressSteps([])

    try {
      const response = await fetch('/api/snewclaw/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llm: { ...llm, baseUrl: llm.baseUrl || undefined },
          permissions,
        }),
      })

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => 'Provision failed')
        setProvisionError(text)
        setIsProvisioning(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

        for (const line of lines) {
          const json = line.slice(6).trim()
          if (!json || json === '[DONE]') continue
          try {
            const event = JSON.parse(json) as {
              step: string
              progress?: number
              error?: string
              instanceId?: string
            }

            if (event.step === 'done') {
              router.push('/snewclaw')
              return
            } else if (event.step === 'error') {
              setProvisionError(event.error ?? 'An error occurred')
              setIsProvisioning(false)
              return
            } else {
              const label = event.step.replace(/_/g, ' ')
              setProgressSteps((prev) => {
                // Mark previous steps as done
                const updated = prev.map((s) => ({
                  ...s,
                  status: 'done' as const,
                }))
                return [...updated, { label, status: 'running' as const }]
              })
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (err) {
      setProvisionError(err instanceof Error ? err.message : 'Provision failed')
    } finally {
      setIsProvisioning(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 pt-12 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Set up your Parent Agent</h1>
        <p className="text-muted-foreground text-sm">Configure and deploy your personal AI agent</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                i < step
                  ? 'bg-primary text-primary-foreground'
                  : i === step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {i < step ? <Check className="size-3" /> : i + 1}
            </div>
            <span
              className={cn(
                'text-sm',
                i === step ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="text-muted-foreground size-4" />}
          </div>
        ))}
      </div>

      {/* Step 1: LLM Configuration */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>LLM Configuration</CardTitle>
            <CardDescription>Choose the language model that will power your agent</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={llm.provider}
                onValueChange={(v) => handleProviderChange(v as Provider)}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={llm.apiKey}
                onChange={(e) => setLlm((prev) => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                type="text"
                value={llm.model}
                onChange={(e) => setLlm((prev) => ({ ...prev, model: e.target.value }))}
              />
            </div>

            {llm.provider === 'custom' && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="base-url">Base URL</Label>
                <Input
                  id="base-url"
                  type="text"
                  placeholder="https://api.example.com/v1"
                  value={llm.baseUrl}
                  onChange={(e) => setLlm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={() => setStep(1)} disabled={!llm.apiKey || !llm.model}>
              Next
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Permissions */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>
              Choose what capabilities your agent will have access to
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {PERMISSIONS.map(({ key, label, description }) => (
              <button
                key={key}
                type="button"
                onClick={() => togglePermission(key)}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-4 text-left transition-colors',
                  permissions[key]
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-muted-foreground text-xs">{description}</p>
                </div>
                <div
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full border-2 transition-colors',
                    permissions[key] ? 'border-primary bg-primary' : 'border-muted-foreground'
                  )}
                >
                  {permissions[key] && <Check className="text-primary-foreground size-3" />}
                </div>
              </button>
            ))}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={() => setStep(2)}>Next</Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Review & Provision */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Provision</CardTitle>
            <CardDescription>Confirm your configuration before deploying</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">LLM</p>
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Provider:</span>{' '}
                  <span className="font-medium capitalize">{llm.provider}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Model:</span>{' '}
                  <span className="font-medium">{llm.model}</span>
                </p>
                {llm.provider === 'custom' && llm.baseUrl && (
                  <p>
                    <span className="text-muted-foreground">Base URL:</span>{' '}
                    <span className="font-medium">{llm.baseUrl}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Permissions</p>
              <div className="flex flex-wrap gap-2">
                {PERMISSIONS.filter(({ key }) => permissions[key]).map(({ label }) => (
                  <Badge key={label} variant="secondary">
                    {label}
                  </Badge>
                ))}
                {!PERMISSIONS.some(({ key }) => permissions[key]) && (
                  <p className="text-muted-foreground text-sm">No permissions enabled</p>
                )}
              </div>
            </div>

            {progressSteps.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Deployment Progress</p>
                <div className="flex flex-col gap-1.5">
                  {progressSteps.map((ps) => (
                    <div key={ps.label} className="flex items-center gap-2 text-sm">
                      {ps.status === 'running' && (
                        <Loader2 className="text-primary size-4 animate-spin" />
                      )}
                      {ps.status === 'done' && <Check className="size-4 text-green-600" />}
                      {ps.status === 'error' && (
                        <span className="text-destructive size-4 text-xs">✕</span>
                      )}
                      {ps.status === 'pending' && (
                        <span className="text-muted-foreground size-4 text-xs">○</span>
                      )}
                      <span
                        className={cn(
                          ps.status === 'done' && 'text-muted-foreground line-through',
                          ps.status === 'error' && 'text-destructive'
                        )}
                      >
                        {ps.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {provisionError && <p className="text-destructive text-sm">{provisionError}</p>}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setStep(1)} disabled={isProvisioning}>
              Back
            </Button>
            <Button onClick={handleProvision} disabled={isProvisioning}>
              {isProvisioning && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isProvisioning ? 'Deploying…' : 'Deploy Agent'}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
