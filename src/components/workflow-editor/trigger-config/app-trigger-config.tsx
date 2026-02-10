'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { AppsTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

export function AppTriggerConfigForm({
  config,
  onUpdate,
}: {
  config: AppsTriggerConfig
  onUpdate: (config: AppsTriggerConfig) => void
}) {
  const filterEntries = Object.entries(config.filters)

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
    <div className="flex flex-col gap-4">
      <div>
        <Label>App ID</Label>
        <Input
          value={config.app_id}
          onChange={(e) => onUpdate({ ...config, app_id: e.target.value })}
          placeholder="e.g. slack, github, notion"
          className="mt-1"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Future: this will be a selector for connected apps
        </p>
      </div>

      <div>
        <Label>Event</Label>
        <Input
          value={config.event}
          onChange={(e) => onUpdate({ ...config, event: e.target.value })}
          placeholder="e.g. message.created, issue.opened"
          className="mt-1"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Filters</Label>
        <Button size="sm" variant="outline" onClick={addFilter}>
          <Plus className="mr-1 h-3 w-3" />
          Add filter
        </Button>
      </div>

      {filterEntries.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No filters defined. Click &ldquo;Add filter&rdquo; to create one.
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
    </div>
  )
}
