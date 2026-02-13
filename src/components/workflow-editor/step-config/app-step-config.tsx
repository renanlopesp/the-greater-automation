'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  Linkedin,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Zap,
} from 'lucide-react'
import { APP_INTEGRATIONS } from '@/lib/data/app-integrations'
import { useAppConnections } from '@/hooks/use-app-connections'
import { useAppActions } from '@/hooks/use-app-actions'
import { useAppResources } from '@/hooks/use-app-resources'
import { getAppModule } from '@/lib/composio/modules'
import { categorizeAction } from '@/lib/composio/actions/categorize'
import type { ActionType } from '@/lib/composio/actions/categorize'
import type { FieldOverride } from '@/lib/composio/modules'
import type { AppStepConfig } from '@/lib/workflow-editor/step-defaults'
import type { ComposioAppAction } from '@/lib/composio/actions/get-app-actions'
import { cn } from '@/lib/utils'

const SIMPLEICONS_UNAVAILABLE = new Set(['linkedin'])

// --- Action type icon mapping ---

function ActionTypeIcon({ type, className }: { type: ActionType; className?: string }) {
  switch (type) {
    case 'create':
      return <Plus className={cn('h-3.5 w-3.5 text-blue-500', className)} />
    case 'update':
      return <Pencil className={cn('h-3.5 w-3.5 text-amber-500', className)} />
    case 'delete':
      return <Trash2 className={cn('h-3.5 w-3.5 text-red-500', className)} />
    case 'find':
      return <Search className={cn('text-muted-foreground h-3.5 w-3.5', className)} />
    default:
      return <Zap className={cn('text-muted-foreground h-3.5 w-3.5', className)} />
  }
}

// --- Searchable Combobox for data-driven fields ---

interface SearchableComboboxProps {
  id?: string
  items: { label: string; value: string }[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  isLoading?: boolean
  disabled?: boolean
}

function SearchableCombobox({
  id,
  items,
  value,
  onValueChange,
  placeholder = 'Select...',
  isLoading,
  disabled,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedLabel = items.find((item) => item.value === value)?.label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="mt-1 w-full justify-between font-normal"
        >
          {isLoading ? (
            <span className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : selectedLabel ? (
            <span className="truncate">{selectedLabel}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onValueChange(item.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === item.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {items.length >= 20 && (
              <p className="text-muted-foreground px-2 py-1.5 text-center text-xs">
                Start typing to search for more results
              </p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// --- Dynamic Form Field ---

interface DynamicFieldProps {
  appId: string
  param: {
    key: string
    label: string
    type: string
    required: boolean
    placeholder?: string
    description?: string
  }
  override?: FieldOverride
  value: unknown
  inputs: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

function DynamicField({ appId, param, override, value, inputs, onChange }: DynamicFieldProps) {
  // Check if dependencies are met for data-driven fields
  const dependsOn = override?.dependsOn
  const dependenciesMet = useMemo(() => {
    if (!dependsOn) return true
    return dependsOn.every((dep) => !!inputs[dep])
  }, [dependsOn, inputs])

  // Build params for the fetch action, injecting dependent values
  const fetchParams = useMemo(() => {
    if (!override) return undefined
    const params: Record<string, unknown> = { ...override.dataSource.params }
    if (override.dependsOn) {
      for (const dep of override.dependsOn) {
        if (inputs[dep]) params[dep] = inputs[dep]
      }
    }
    return params
  }, [override, inputs])

  // Fetch resources for data-driven fields
  const { data: resourceData, isLoading: isLoadingResources } = useAppResources(
    override ? appId : null,
    override?.dataSource.action ?? null,
    override?.dataSource.displayField ?? '',
    override?.dataSource.valueField ?? '',
    fetchParams,
    override?.dataSource.resultPath,
    dependenciesMet
  )

  const items = resourceData?.items ?? []

  // Render searchable combobox for select fields
  if (override?.type === 'select') {
    return (
      <div>
        <Label htmlFor={`input-${param.key}`} className="text-sm font-medium">
          {param.label}
          {param.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {param.description && (
          <p className="text-muted-foreground mt-0.5 text-xs">{param.description}</p>
        )}
        {!dependenciesMet ? (
          <div className="border-input bg-muted/30 mt-1 rounded-md border p-2.5">
            <p className="text-muted-foreground text-sm">
              Select {override.dependsOn?.join(' and ')} first
            </p>
          </div>
        ) : (
          <SearchableCombobox
            id={`input-${param.key}`}
            items={items}
            value={String(value || '')}
            onValueChange={(v) => onChange(param.key, v)}
            placeholder={`Select ${param.label.toLowerCase()}`}
            isLoading={isLoadingResources}
          />
        )}
      </div>
    )
  }

  // Render data-driven multi-select (button-based toggle)
  if (override?.type === 'multi-select') {
    const selectedValues = Array.isArray(value) ? (value as string[]) : []

    const toggleValue = (v: string) => {
      const next = selectedValues.includes(v)
        ? selectedValues.filter((sv) => sv !== v)
        : [...selectedValues, v]
      onChange(param.key, next)
    }

    return (
      <div>
        <Label className="text-sm font-medium">
          {param.label}
          {param.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {param.description && (
          <p className="text-muted-foreground mt-0.5 text-xs">{param.description}</p>
        )}
        {!dependenciesMet ? (
          <div className="border-input bg-muted/30 mt-1 rounded-md border p-2.5">
            <p className="text-muted-foreground text-sm">
              Select {override.dependsOn?.join(' and ')} first
            </p>
          </div>
        ) : isLoadingResources ? (
          <div className="border-input mt-1 flex items-center gap-2 rounded-md border p-2.5">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        ) : (
          <div className="border-input mt-1 flex flex-wrap gap-1.5 rounded-md border p-2">
            {items.length === 0 ? (
              <span className="text-muted-foreground text-sm">No options available</span>
            ) : (
              items.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggleValue(item.value)}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                    selectedValues.includes(item.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'border-input hover:bg-accent border bg-transparent'
                  )}
                >
                  {item.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    )
  }

  // Default: render based on param type
  if (param.type === 'textarea') {
    return (
      <div>
        <Label htmlFor={`input-${param.key}`} className="text-sm font-medium">
          {param.label}
          {param.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {param.description && (
          <p className="text-muted-foreground mt-0.5 text-xs">{param.description}</p>
        )}
        <Textarea
          id={`input-${param.key}`}
          value={String(value)}
          onChange={(e) => onChange(param.key, e.target.value)}
          placeholder={param.placeholder}
          className="mt-1"
          required={param.required}
        />
      </div>
    )
  }

  if (param.type === 'number') {
    return (
      <div>
        <Label htmlFor={`input-${param.key}`} className="text-sm font-medium">
          {param.label}
          {param.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {param.description && (
          <p className="text-muted-foreground mt-0.5 text-xs">{param.description}</p>
        )}
        <Input
          id={`input-${param.key}`}
          type="number"
          value={String(value)}
          onChange={(e) => onChange(param.key, Number(e.target.value))}
          placeholder={param.placeholder}
          className="mt-1"
          required={param.required}
        />
      </div>
    )
  }

  // Default text input
  return (
    <div>
      <Label htmlFor={`input-${param.key}`} className="text-sm font-medium">
        {param.label}
        {param.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {param.description && (
        <p className="text-muted-foreground mt-0.5 text-xs">{param.description}</p>
      )}
      <Input
        id={`input-${param.key}`}
        type={param.type === 'url' ? 'url' : 'text'}
        value={String(value)}
        onChange={(e) => onChange(param.key, e.target.value)}
        placeholder={param.placeholder}
        className="mt-1"
        required={param.required}
      />
    </div>
  )
}

// --- Main Component ---

export default function AppStepConfigForm({
  config,
  onUpdate,
}: {
  config: AppStepConfig
  onUpdate: (config: AppStepConfig) => void
}) {
  const [actionSearch, setActionSearch] = useState('')

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

  // Get module for field override info
  const appModule = useMemo(
    () => (config.app_id ? getAppModule(config.app_id) : undefined),
    [config.app_id]
  )

  // Auto-categorize and group actions
  const categorizedActions = useMemo(() => {
    if (!actions || actions.length === 0) return []

    const categories = new Map<string, { action: ComposioAppAction; actionType: ActionType }[]>()

    for (const action of actions) {
      const { category, actionType } = categorizeAction(action.name, config.app_id)

      if (!categories.has(category)) {
        categories.set(category, [])
      }
      categories.get(category)!.push({ action, actionType })
    }

    // Sort categories alphabetically, but put "General" last
    return Array.from(categories.entries())
      .sort(([a], [b]) => {
        if (a === 'General') return 1
        if (b === 'General') return -1
        return a.localeCompare(b)
      })
      .map(([name, items]) => ({ name, items }))
  }, [actions, config.app_id])

  // Filter actions by search query
  const filteredActions = useMemo(() => {
    if (!actionSearch.trim()) return categorizedActions

    const query = actionSearch.toLowerCase()
    const filtered: typeof categorizedActions = []

    for (const category of categorizedActions) {
      const matchingItems = category.items.filter(
        (item) =>
          item.action.displayName.toLowerCase().includes(query) ||
          item.action.name.toLowerCase().includes(query)
      )
      if (matchingItems.length > 0) {
        filtered.push({ name: category.name, items: matchingItems })
      }
    }

    return filtered
  }, [categorizedActions, actionSearch])

  // Find selected action
  const selectedAction = useMemo(() => {
    if (!config.action || !actions) return undefined
    return actions.find((a) => a.name === config.action)
  }, [config.action, actions])

  const handleAppSelect = (appId: string) => {
    setActionSearch('')
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

      {/* Section 2: Categorized Action List with Search */}
      {config.app_id && (
        <div>
          <Label className="text-sm font-medium">Select Action</Label>

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
            <div className="mt-1">
              {/* Search bar */}
              <div className="border-input flex items-center gap-2 rounded-md border px-3 py-2">
                <Search className="text-muted-foreground h-4 w-4 shrink-0" />
                <input
                  type="text"
                  value={actionSearch}
                  onChange={(e) => setActionSearch(e.target.value)}
                  placeholder="Search actions..."
                  className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
                />
              </div>

              {/* Collapsible category drawers */}
              <div className="mt-2 flex max-h-[300px] flex-col gap-1 overflow-y-auto">
                {filteredActions.length === 0 ? (
                  <div className="text-muted-foreground py-3 text-center text-sm">
                    No actions match &ldquo;{actionSearch}&rdquo;
                  </div>
                ) : (
                  filteredActions.map((category) => (
                    <Collapsible key={category.name} defaultOpen>
                      <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors">
                        <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform [[data-state=closed]>&]:rotate-[-90deg]" />
                        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                          {category.name}
                        </span>
                        <span className="text-muted-foreground/60 ml-auto text-[10px]">
                          {category.items.length}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="flex flex-col gap-0.5 py-0.5 pl-2">
                          {category.items.map(({ action, actionType }) => (
                            <button
                              key={action.name}
                              type="button"
                              onClick={() => handleActionSelect(action.name)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                                'hover:bg-accent/50',
                                config.action === action.name
                                  ? 'bg-accent font-medium'
                                  : 'bg-transparent'
                              )}
                            >
                              <ActionTypeIcon type={actionType} />
                              <span className="min-w-0 flex-1 truncate">{action.displayName}</span>
                            </button>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 3: Data-Driven Form Fields */}
      {selectedAction && selectedAction.params.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">Configuration</div>
          {selectedAction.params.map((param) => {
            const override = appModule?.actions[config.action]?.fieldOverrides?.[param.key]
            return (
              <DynamicField
                key={param.key}
                appId={config.app_id}
                param={param}
                override={override}
                value={config.inputs[param.key] ?? ''}
                inputs={config.inputs}
                onChange={handleInputChange}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
