'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { Check, ChevronsUpDown, Linkedin, Loader2, Plus, Trash2, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { APP_INTEGRATIONS } from '@/lib/data/app-integrations'
import { useAppConnections } from '@/hooks/use-app-connections'
import { useAppResources } from '@/hooks/use-app-resources'
import { listAvailableTriggers } from '@/lib/actions/trigger-subscriptions'
import { getAppModule } from '@/lib/composio/modules'
import type { AppsTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

const SIMPLEICONS_UNAVAILABLE = new Set(['linkedin'])

interface AvailableTrigger {
  slug: string
  name: string
  description: string
  config_schema: Record<string, unknown>
}

/**
 * Extract required field names from a Composio trigger config schema.
 */
function getRequiredConfigFields(schema: Record<string, unknown>): string[] {
  if (Array.isArray(schema.required)) {
    return schema.required.filter((r): r is string => typeof r === 'string')
  }
  if (schema.properties && typeof schema.properties === 'object') {
    return Object.keys(schema.properties as Record<string, unknown>)
  }
  const fields: string[] = []
  for (const [key, value] of Object.entries(schema)) {
    if (typeof value === 'string' || (typeof value === 'object' && value !== null)) {
      fields.push(key)
    }
  }
  return fields
}

/**
 * Check if a trigger config has owner+repo fields (GitHub-style repo picker).
 */
function hasRepoFields(fields: string[]): boolean {
  return fields.includes('owner') && fields.includes('repo')
}

export function AppTriggerConfigForm({
  config,
  onUpdate,
}: {
  config: AppsTriggerConfig
  onUpdate: (config: AppsTriggerConfig) => void
}) {
  const [triggers, setTriggers] = useState<AvailableTrigger[]>([])
  const [loadingTriggers, startLoadingTriggers] = useTransition()
  const [repoPickerOpen, setRepoPickerOpen] = useState(false)

  const { data: connectionsData, isLoading: isLoadingConnections } = useAppConnections()
  const connections = useMemo(
    () => connectionsData?.connections ?? [],
    [connectionsData?.connections]
  )

  const connectedApps = useMemo(() => {
    const connectedIds = new Set(connections.map((c) => c.app_id))
    return APP_INTEGRATIONS.filter((app) => connectedIds.has(app.id))
  }, [connections])

  const filterEntries = Object.entries(config.filters)

  const selectedTrigger = useMemo(
    () => triggers.find((t) => t.slug === config.event),
    [triggers, config.event]
  )
  const configFields = useMemo(
    () => (selectedTrigger ? getRequiredConfigFields(selectedTrigger.config_schema) : []),
    [selectedTrigger]
  )

  const showRepoPicker = hasRepoFields(configFields)
  const nonRepoFields = useMemo(
    () =>
      showRepoPicker ? configFields.filter((f) => f !== 'owner' && f !== 'repo') : configFields,
    [configFields, showRepoPicker]
  )

  // Look up the app module to get the correct action slug for listing repos
  const repoDataSource = useMemo(() => {
    if (!showRepoPicker || !config.app_id) return null
    const mod = getAppModule(config.app_id)
    if (!mod) return null
    // Find the first action that has a `repo` field override with a dataSource
    for (const actionDef of Object.values(mod.actions)) {
      const repoOverride = actionDef.fieldOverrides?.repo
      if (repoOverride?.dataSource) {
        return repoOverride.dataSource
      }
    }
    return null
  }, [showRepoPicker, config.app_id])

  // Fetch repos from the connected app when repo picker is needed
  const { data: reposData, isLoading: isLoadingRepos } = useAppResources(
    repoDataSource ? config.app_id : null,
    repoDataSource?.action ?? null,
    repoDataSource?.displayField ?? 'full_name',
    repoDataSource?.displayField ?? 'full_name',
    repoDataSource?.params
  )

  const repos = useMemo(() => reposData?.items ?? [], [reposData?.items])

  const selectedRepoLabel = useMemo(() => {
    const owner = config.trigger_config?.owner
    const repo = config.trigger_config?.repo
    if (owner && repo) return `${owner}/${repo}`
    return ''
  }, [config.trigger_config?.owner, config.trigger_config?.repo])

  // Load triggers when app changes
  const appId = config.app_id
  useEffect(() => {
    if (!appId) return
    startLoadingTriggers(async () => {
      const result = await listAvailableTriggers(appId)
      if (result.triggers) {
        setTriggers(
          result.triggers.map((t) => ({
            slug: String(t.slug ?? ''),
            name: String(t.name ?? t.slug ?? ''),
            description: String(t.description ?? ''),
            config_schema: (t.config_schema ?? {}) as Record<string, unknown>,
          }))
        )
      }
    })
  }, [appId])

  // Clear triggers when app is deselected
  const triggersForApp = appId ? triggers : []

  const handleAppSelect = (appId: string) => {
    onUpdate({ ...config, app_id: appId, event: '', trigger_config: {} })
  }

  const handleTriggerSelect = (slug: string) => {
    onUpdate({ ...config, event: slug, trigger_config: {} })
  }

  const handleRepoSelect = (fullName: string) => {
    const [owner, ...repoParts] = fullName.split('/')
    const repo = repoParts.join('/')
    onUpdate({
      ...config,
      trigger_config: { ...(config.trigger_config ?? {}), owner, repo },
    })
    setRepoPickerOpen(false)
  }

  const updateTriggerConfig = (key: string, value: string) => {
    onUpdate({
      ...config,
      trigger_config: { ...(config.trigger_config ?? {}), [key]: value },
    })
  }

  const addFilter = () => {
    onUpdate({
      ...config,
      filters: { ...config.filters, '': '' },
    })
  }

  const removeFilter = (key: string) => {
    const newFilters = { ...config.filters }
    delete newFilters[key]
    onUpdate({ ...config, filters: newFilters })
  }

  const updateFilter = (oldKey: string, newKey: string, value: string) => {
    const newFilters = { ...config.filters }
    if (oldKey !== newKey) {
      delete newFilters[oldKey]
    }
    newFilters[newKey] = value
    onUpdate({ ...config, filters: newFilters })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Section 1: App Selection Grid */}
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

      {/* Section 2: Trigger Selection */}
      {config.app_id && (
        <div>
          <Label className="text-sm font-medium">Select Event</Label>

          {loadingTriggers ? (
            <div className="border-input mt-1 flex items-center justify-center rounded-md border py-3">
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              <span className="text-muted-foreground ml-2 text-sm">Loading events...</span>
            </div>
          ) : triggersForApp.length === 0 ? (
            <div className="mt-1">
              <Input
                value={config.event}
                onChange={(e) => onUpdate({ ...config, event: e.target.value })}
                placeholder="e.g. GITHUB_PULL_REQUEST_OPENED"
                className="mt-1"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                No triggers found via API. Type the trigger slug manually.
              </p>
            </div>
          ) : (
            <div className="mt-1 flex max-h-[280px] flex-col gap-0.5 overflow-y-auto rounded-md border p-1">
              {triggersForApp.map((trigger) => (
                <button
                  key={trigger.slug}
                  type="button"
                  onClick={() => handleTriggerSelect(trigger.slug)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-md px-3 py-2 text-left transition-colors',
                    'hover:bg-accent/50',
                    config.event === trigger.slug
                      ? 'bg-accent ring-primary ring-1'
                      : 'bg-transparent'
                  )}
                >
                  <Zap className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{trigger.name}</div>
                    {trigger.description && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                        {trigger.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {config.event && (
            <p className="text-muted-foreground mt-1 text-xs">
              Trigger:{' '}
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">
                {config.event}
              </code>
            </p>
          )}
        </div>
      )}

      {/* Section 3: Trigger Configuration */}
      {config.app_id && config.event && (showRepoPicker || nonRepoFields.length > 0) && (
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">Trigger Configuration</Label>

          {/* Repository picker (for GitHub-style owner+repo) */}
          {showRepoPicker && (
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs">Repository</Label>
              <Popover open={repoPickerOpen} onOpenChange={setRepoPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={repoPickerOpen}
                    className="w-full justify-between font-normal"
                  >
                    {isLoadingRepos ? (
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading repositories...
                      </span>
                    ) : selectedRepoLabel ? (
                      <span className="truncate">{selectedRepoLabel}</span>
                    ) : (
                      <span className="text-muted-foreground">Select a repository...</span>
                    )}
                    <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search repositories..." />
                    <CommandList>
                      <CommandEmpty>No repositories found.</CommandEmpty>
                      <CommandGroup>
                        {repos.map((repo) => (
                          <CommandItem
                            key={repo.value}
                            value={repo.value}
                            onSelect={handleRepoSelect}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedRepoLabel === repo.value ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className="truncate">{repo.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Other config fields (non owner/repo) */}
          {nonRepoFields.map((field) => (
            <div key={field}>
              <Label className="text-muted-foreground mb-1 block text-xs capitalize">
                {field.replace(/_/g, ' ')}
              </Label>
              <Input
                value={config.trigger_config?.[field] ?? ''}
                onChange={(e) => updateTriggerConfig(field, e.target.value)}
                placeholder={field}
              />
            </div>
          ))}
        </div>
      )}

      {/* Section 4: Filters */}
      {config.app_id && config.event && (
        <>
          <div className="flex items-center justify-between">
            <Label>Filters</Label>
            <Button size="sm" variant="outline" onClick={addFilter}>
              <Plus className="mr-1 h-3 w-3" />
              Add filter
            </Button>
          </div>

          {filterEntries.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No filters. All events of this type will trigger the workflow.
            </p>
          )}

          {filterEntries.map(([key, value], index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={key}
                onChange={(e) => updateFilter(key, e.target.value, value)}
                placeholder="Filter key"
                className="flex-1"
              />
              <Input
                value={value}
                onChange={(e) => updateFilter(key, key, e.target.value)}
                placeholder="Filter value"
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10"
                onClick={() => removeFilter(key)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
