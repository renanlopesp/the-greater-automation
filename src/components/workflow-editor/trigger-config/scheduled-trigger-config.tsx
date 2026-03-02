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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { ScheduledTriggerConfig } from '@/lib/workflow-editor/trigger-defaults'

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

export function ScheduledTriggerConfigForm({
  config,
  onUpdate,
}: {
  config: ScheduledTriggerConfig
  onUpdate: (config: ScheduledTriggerConfig) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Tipo de agendamento</Label>
        <RadioGroup
          value={config.schedule_type}
          onValueChange={(v) =>
            onUpdate({ ...config, schedule_type: v as ScheduledTriggerConfig['schedule_type'] })
          }
          className="mt-2 flex flex-col gap-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="interval" id="interval" />
            <Label htmlFor="interval" className="font-normal">
              Intervalo
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cron" id="cron" />
            <Label htmlFor="cron" className="font-normal">
              Expressão cron
            </Label>
          </div>
        </RadioGroup>
      </div>

      {config.schedule_type === 'interval' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Label>Valor</Label>
            <Input
              type="number"
              min={1}
              value={config.interval_value ?? 1}
              onChange={(e) =>
                onUpdate({ ...config, interval_value: parseInt(e.target.value) || 1 })
              }
              className="mt-1"
            />
          </div>
          <div className="flex-1">
            <Label>Unidade</Label>
            <Select
              value={config.interval_unit ?? 'hours'}
              onValueChange={(v) =>
                onUpdate({
                  ...config,
                  interval_unit: v as ScheduledTriggerConfig['interval_unit'],
                })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutos</SelectItem>
                <SelectItem value="hours">Horas</SelectItem>
                <SelectItem value="days">Dias</SelectItem>
                <SelectItem value="weeks">Semanas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {config.schedule_type === 'cron' && (
        <div>
          <Label>Expressão cron</Label>
          <Input
            value={config.cron_expression ?? ''}
            onChange={(e) => onUpdate({ ...config, cron_expression: e.target.value })}
            placeholder="0 0 * * *"
            className="mt-1"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Exemplo: &ldquo;0 0 * * *&rdquo; executa diariamente à meia-noite
          </p>
        </div>
      )}

      <div>
        <Label>Fuso horário</Label>
        <Select value={config.timezone} onValueChange={(v) => onUpdate({ ...config, timezone: v })}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
