'use client'

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
import { Linkedin } from 'lucide-react'
import { getAllAppDefinitions, getAppDefinition, getAppAction } from '@/lib/oauth/app-actions'
import type { AppStepConfig } from '@/lib/workflow-editor/step-defaults'
import { cn } from '@/lib/utils'

export default function AppStepConfigForm({
  config,
  onUpdate,
}: {
  config: AppStepConfig
  onUpdate: (config: AppStepConfig) => void
}) {
  const apps = getAllAppDefinitions()
  const selectedApp = config.app_id ? getAppDefinition(config.app_id) : undefined
  const selectedAction =
    config.app_id && config.action ? getAppAction(config.app_id, config.action) : undefined

  const handleAppSelect = (appId: string) => {
    onUpdate({ app_id: appId, action: '', inputs: {} })
  }

  const handleActionSelect = (actionId: string) => {
    onUpdate({ ...config, action: actionId, inputs: {} })
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
        <div className="grid grid-cols-2 gap-2">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => handleAppSelect(app.id)}
              className={cn(
                'hover:bg-accent/50 flex items-center gap-2 rounded-md border bg-transparent p-3 text-left transition-all',
                config.app_id === app.id ? 'ring-primary border-primary ring-2' : 'border-input'
              )}
            >
              {app.iconSlug === 'linkedin' ? (
                <Linkedin className="h-5 w-5 shrink-0" />
              ) : (
                <img
                  src={`https://cdn.simpleicons.org/${app.iconSlug}/white`}
                  alt={app.name}
                  className="h-5 w-5 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{app.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Action Selection */}
      {selectedApp && (
        <div>
          <Label htmlFor="action-select" className="text-sm font-medium">
            Action
          </Label>
          <Select value={config.action} onValueChange={handleActionSelect}>
            <SelectTrigger id="action-select" className="mt-1 w-full">
              <SelectValue placeholder="Select an action" />
            </SelectTrigger>
            <SelectContent>
              {selectedApp.actions.map((action) => (
                <SelectItem key={action.id} value={action.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{action.name}</span>
                    <span className="text-muted-foreground text-xs">{action.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Section 3: Dynamic Input Fields */}
      {selectedAction && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">Configuration</div>
          {selectedAction.inputs.map((input) => {
            const value = config.inputs[input.key] ?? ''

            return (
              <div key={input.key}>
                <Label htmlFor={`input-${input.key}`} className="text-sm font-medium">
                  {input.label}
                  {input.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {input.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs">{input.description}</p>
                )}

                {/* Render appropriate input based on type */}
                {input.type === 'textarea' ? (
                  <Textarea
                    id={`input-${input.key}`}
                    value={String(value)}
                    onChange={(e) => handleInputChange(input.key, e.target.value)}
                    placeholder={input.placeholder}
                    className="mt-1"
                    required={input.required}
                  />
                ) : input.type === 'select' ? (
                  <Select
                    value={String(value)}
                    onValueChange={(val) => handleInputChange(input.key, val)}
                  >
                    <SelectTrigger id={`input-${input.key}`} className="mt-1 w-full">
                      <SelectValue placeholder={input.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {input.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : input.type === 'number' ? (
                  <Input
                    id={`input-${input.key}`}
                    type="number"
                    value={String(value)}
                    onChange={(e) => handleInputChange(input.key, Number(e.target.value))}
                    placeholder={input.placeholder}
                    className="mt-1"
                    required={input.required}
                  />
                ) : input.type === 'url' ? (
                  <Input
                    id={`input-${input.key}`}
                    type="url"
                    value={String(value)}
                    onChange={(e) => handleInputChange(input.key, e.target.value)}
                    placeholder={input.placeholder}
                    className="mt-1"
                    required={input.required}
                  />
                ) : (
                  <Input
                    id={`input-${input.key}`}
                    type="text"
                    value={String(value)}
                    onChange={(e) => handleInputChange(input.key, e.target.value)}
                    placeholder={input.placeholder}
                    className="mt-1"
                    required={input.required}
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
