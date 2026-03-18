'use client'

import { cn } from '@/lib/utils'
import type { EscalationCardsOutput } from '@/lib/modules/output-schemas'

interface ArtifactEscalationCardsProps {
  data: EscalationCardsOutput
}

const STATUS_STYLES: Record<string, string> = {
  andamento: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  resolvido: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  aguardando: 'bg-muted text-muted-foreground',
}

const STATUS_LABELS: Record<string, string> = {
  andamento: 'em andamento',
  resolvido: 'resolvido',
  aguardando: 'aguardando',
}

export default function ArtifactEscalationCards({ data }: ArtifactEscalationCardsProps) {
  return (
    <div className="space-y-3">
      {data.cases.map((item, i) => (
        <div key={i} className="border-border rounded-lg border p-3">
          {/* Header: name + status badge */}
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-foreground text-sm font-semibold">{item.customer_name}</p>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                STATUS_STYLES[item.status] ?? STATUS_STYLES.aguardando
              )}
            >
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
          </div>

          {/* Fields */}
          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-muted-foreground font-medium">Problema: </span>
              <span className="text-foreground">{item.problem}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">O que fiz: </span>
              <span className="text-foreground">{item.action_taken}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Escalei porque: </span>
              <span className="text-foreground">{item.escalation_reason}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
