'use client'

import { useLanguage } from '@/contexts/language-context'
import type { Metric } from '@/data/home-dashboard'

interface MetricsCardsProps {
  metrics: Metric[]
  scenarioIdx: number
}

export default function MetricsCards({ metrics, scenarioIdx }: MetricsCardsProps) {
  const { t } = useLanguage()

  return (
    <div
      key={`metrics-${scenarioIdx}`}
      className="animate-fade-in grid grid-cols-2 gap-3 md:grid-cols-5"
    >
      {metrics.map((m) =>
        m.pulse ? (
          <div key={m.label} className="conic-border">
            <div className="conic-border-inner flex h-full flex-col gap-1 p-5">
              <p className="text-muted-foreground text-[11px] font-medium">{t(m.label)}</p>
              <p className="text-foreground text-2xl font-semibold">{m.value}</p>
              <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--green)' }}>
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: 'var(--green)' }}
                />
                {t(m.sub)}
              </p>
            </div>
          </div>
        ) : (
          <div
            key={m.label}
            className="bg-background border-border flex flex-col gap-1 rounded-2xl border p-5"
          >
            <p className="text-muted-foreground text-[11px] font-medium">{t(m.label)}</p>
            <p className="text-foreground text-2xl font-semibold">{m.value}</p>
            <p className="text-muted-foreground flex items-center gap-1 text-xs">{t(m.sub)}</p>
          </div>
        )
      )}
    </div>
  )
}
