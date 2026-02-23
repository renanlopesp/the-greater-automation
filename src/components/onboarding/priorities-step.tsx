'use client'

import { cn } from '@/lib/utils'
import { PRIORITIES, PRIORITY_LABELS, type Priority } from '@/lib/retail/segment-skills'

interface PrioritiesStepProps {
  value: Priority[]
  onChange: (value: Priority[]) => void
}

const PRIORITY_ICONS: Record<Priority, string> = {
  controle_de_estoque: '📦',
  monitorar_concorrencia: '👀',
  resumo_de_vendas: '📊',
  atendimento: '💬',
  alertas_de_pedidos: '🔔',
}

const PRIORITY_DESCRIPTIONS: Record<Priority, string> = {
  controle_de_estoque: 'Alerts when a product is running low',
  monitorar_concorrencia: 'Tracks competitor prices',
  resumo_de_vendas: 'Daily sales summary via Telegram',
  atendimento: 'Helps respond to customers faster',
  alertas_de_pedidos: 'Instant notification for new orders',
}

export function PrioritiesStep({ value, onChange }: PrioritiesStepProps) {
  const toggle = (priority: Priority) => {
    if (value.includes(priority)) {
      onChange(value.filter((p) => p !== priority))
    } else {
      onChange([...value, priority])
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">What matters most to you?</h2>
        <p className="text-muted-foreground">
          Select at least one priority. We&apos;ll set up automatic alerts.
        </p>
      </div>
      <div className="space-y-3">
        {PRIORITIES.map((priority) => (
          <button
            key={priority}
            type="button"
            onClick={() => toggle(priority)}
            className={cn(
              'hover:bg-accent flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors',
              value.includes(priority) && 'border-primary bg-accent'
            )}
          >
            <span className="text-2xl">{PRIORITY_ICONS[priority]}</span>
            <div>
              <p className="text-sm font-medium">{PRIORITY_LABELS[priority]}</p>
              <p className="text-muted-foreground text-xs">{PRIORITY_DESCRIPTIONS[priority]}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
