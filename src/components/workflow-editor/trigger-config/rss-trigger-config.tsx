'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RSSTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

export function RSSTriggerConfigForm({
  config,
  onUpdate,
}: {
  config: RSSTriggerConfig
  onUpdate: (config: RSSTriggerConfig) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Feed URL</Label>
        <Input
          value={config.feed_url}
          onChange={(e) => onUpdate({ ...config, feed_url: e.target.value })}
          placeholder="https://example.com/feed.xml"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Intervalo de verificação</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={config.check_interval_minutes}
            onChange={(e) =>
              onUpdate({
                ...config,
                check_interval_minutes: parseInt(e.target.value) || 15,
              })
            }
            className="flex-1"
          />
          <span className="text-muted-foreground text-sm">minutos</span>
        </div>
      </div>

      <div>
        <Label>Máximo de itens por verificação</Label>
        <Input
          type="number"
          min={1}
          max={100}
          value={config.max_items_per_check}
          onChange={(e) =>
            onUpdate({
              ...config,
              max_items_per_check: parseInt(e.target.value) || 10,
            })
          }
          className="mt-1"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Número máximo de novos itens para processar
        </p>
      </div>
    </div>
  )
}
