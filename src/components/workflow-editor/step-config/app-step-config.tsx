'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Linkedin, Loader2 } from 'lucide-react'
import { APP_INTEGRATIONS } from '@/lib/data/app-integrations'
import { useAppConnections } from '@/hooks/use-app-connections'
import { useAppActions } from '@/hooks/use-app-actions'
import type { AppStepConfig } from '@/lib/workflow-editor/step-defaults'
import { cn } from '@/lib/utils'

const SIMPLEICONS_UNAVAILABLE = new Set(['linkedin'])

export default function AppStepConfigForm({
  config,
  onUpdate,
}: {
  config: AppStepConfig
  onUpdate: (config: AppStepConfig) => void
}) {
  const { data: connectionsData, isLoading: isLoadingConnections } = useAppConnections()
  const connections = useMemo(
    () => connectionsData?.connections ?? [],
    [connectionsData?.connections]
  )

  // Derive connected apps from connections
  const connectedApps = useMemo(() => {
    const connectedIds = new Set(connections.map((c) => c.app_id))
    return APP_INTEGRATIONS.filter((app) => connectedIds.has(app.id))
  }, [connections])

  // Fetch actions for selected app
  const { data: actions, isLoading: isLoadingActions } = useAppActions(config.app_id || null)

  // Find selected action
  const selectedAction = useMemo(() => {
    if (!config.action || !actions) return undefined
    return actions.find((a) => a.name === config.action)
  }, [config.action, actions])

  const handleAppSelect = (appId: string) => {
    onUpdate({ app_id: appId, action: '', inputs: {} })
  }

  const handleActionSelect = (actionName: string) => {
    onUpdate({ ...config, action: actionName, inputs: {} })
  }

  const handleInputChange = (key: string, value: unknown) => {
    onUpdate({
      ...config,
      inputs: { ...config.inputs, [key]: value },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Section 1: App Selection */}
      <div>
        <Label className="mb-2 block text-sm font-medium">Select App</Label>

        {isLoadingConnections ? (
          <div className="flex items-center justify-center py-8" role="status">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : connectedApps.length === 0 ? (
          <div className="border-input bg-muted/30 rounded-md border p-4 text-center">
            <p className="text-muted-foreground text-sm">
              No apps connected. Go to Settings to connect apps.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {connectedApps.map((app) => {
              const iconSlug = app.iconSlug

              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleAppSelect(app.id)}
                  className={cn(
                    'hover:bg-accent/50 flex items-center gap-2 rounded-md border bg-transparent p-3 text-left transition-all',
                    config.app_id === app.id ? 'ring-primary border-primary ring-2' : 'border-input'
                  )}
                >
                  {iconSlug && !SIMPLEICONS_UNAVAILABLE.has(iconSlug) ? (
                    <Image
                      src={`https://cdn.simpleicons.org/${iconSlug}/black`}
                      alt={app.name}
                      width={20}
                      height={20}
                      className="h-5 w-5 shrink-0 dark:invert"
                      unoptimized
                    />
                  ) : iconSlug === 'linkedin' ? (
                    <Linkedin className="h-5 w-5 shrink-0" />
                  ) : (
                    <div className="bg-muted flex h-5 w-5 items-center justify-center rounded text-[10px] font-medium">
                      {app.name[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{app.name}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Section 2: Action Selection */}
      {config.app_id && (
        <div>
          <Label htmlFor="action-select" className="text-sm font-medium">
            Action
          </Label>

          {isLoadingActions ? (
            <div className="border-input mt-1 flex items-center justify-center rounded-md border py-3">
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              <span className="text-muted-foreground ml-2 text-sm">Loading actions...</span>
            </div>
          ) : !actions || actions.length === 0 ? (
            <div className="border-input bg-muted/30 mt-1 rounded-md border p-3">
              <p className="text-muted-foreground text-sm">No actions available for this app.</p>
            </div>
          ) : (
            <Select value={config.action} onValueChange={handleActionSelect}>
              <SelectTrigger id="action-select" className="mt-1 w-full">
                <SelectValue placeholder="Select an action" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action.name} value={action.name}>
                    <div className="flex flex-col">
                      <span className="font-medium">{action.displayName}</span>
                      {action.description && (
                        <span className="text-muted-foreground text-xs">{action.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Section 3: Dynamic Input Fields */}
      {selectedAction && selectedAction.params.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">Configuration</div>
          {selectedAction.params.map((param) => {
            const value = config.inputs[param.key] ?? ''

            return (
              <div key={param.key}>
                <Label htmlFor={`input-${param.key}`} className="text-sm font-medium">
                  {param.label}
                  {param.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {param.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs">{param.description}</p>
                )}

                {/* Render appropriate input based on type */}
                {param.type === 'textarea' ? (
                  <Textarea
                    id={`input-${param.key}`}
                    value={String(value)}
                    onChange={(e) => handleInputChange(param.key, e.target.value)}
                    placeholder={param.placeholder}
                    className="mt-1"
                    required={param.required}
                  />
                ) : param.type === 'number' ? (
                  <Input
                    id={`input-${param.key}`}
                    type="number"
                    value={String(value)}
                    onChange={(e) => handleInputChange(param.key, Number(e.target.value))}
                    placeholder={param.placeholder}
                    className="mt-1"
                    required={param.required}
                  />
                ) : param.type === 'url' ? (
                  <Input
                    id={`input-${param.key}`}
                    type="url"
                    value={String(value)}
                    onChange={(e) => handleInputChange(param.key, e.target.value)}
                    placeholder={param.placeholder}
                    className="mt-1"
                    required={param.required}
                  />
                ) : (
                  <Input
                    id={`input-${param.key}`}
                    type="text"
                    value={String(value)}
                    onChange={(e) => handleInputChange(param.key, e.target.value)}
                    placeholder={param.placeholder}
                    className="mt-1"
                    required={param.required}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
