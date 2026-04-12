'use client'

import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useArtifactNav } from '@/components/skill-workspace/artifact-nav-context'
// Inlined from deleted seasonal-campaign-generator.ts (spec 064 T016)
type PersonalizedDate = {
  id: string
  name: string
  emoji: string
  date: string
  displayDate: string
  month: string
  day: string
  type: 'universal' | 'niche'
  relevanceReason: string
  estimatedRevenue: number
  potentialValue: string
  priority: 'high' | 'medium' | 'low'
}
type PersonalizedCalendar = {
  year: number
  generatedAt: string
  dates: PersonalizedDate[]
  summary: {
    totalDates: number
    totalPotentialRevenue: number
    nextActionableDate: string | null
  }
  nextYearSuggested: boolean
}

interface CalendarHeroCardProps {
  calendar: PersonalizedCalendar | null
  className?: string
  onRegenerateCalendar?: () => void
  isRegeneratingCalendar?: boolean
}

function formatRevenue(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${Math.round(value / 1_000)}k`
  return `R$ ${value.toLocaleString('pt-BR')}`
}

export function CalendarHeroCard({
  calendar,
  className,
  onRegenerateCalendar,
  isRegeneratingCalendar,
}: CalendarHeroCardProps) {
  const { push } = useArtifactNav()
  const title = calendar ? `Calendario Sazonal ${calendar.year}` : 'Calendario Sazonal'
  const onClick = () => push(title)

  const totalDates = calendar?.summary.totalDates ?? null
  const totalRevenue = calendar?.summary.totalPotentialRevenue ?? null
  const nextDateId = calendar?.summary.nextActionableDate ?? null
  const nextDate = nextDateId ? calendar?.dates.find((d) => d.id === nextDateId) : null

  return (
    <div className="flex w-full items-center justify-center py-8">
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClick()
        }}
        className={cn(
          'group border-border bg-card flex flex-col gap-4 rounded-2xl border p-7 text-left',
          'w-full max-w-[560px] min-w-[300px]',
          'hover:border-foreground/25 cursor-pointer transition-colors duration-150',
          className
        )}
      >
        {/* Icon area */}
        <div className="flex flex-col gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
            style={{ background: 'var(--muted)' }}
          >
            📅
          </div>
          <p className="text-foreground text-base leading-tight font-medium">{title}</p>
        </div>

        {/* Stats */}
        <div
          className="flex flex-col gap-2"
          style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
        >
          {totalDates !== null ? <p>{totalDates} datas mapeadas</p> : <p>Gerando calendário...</p>}
          {totalRevenue !== null && <p>{formatRevenue(totalRevenue)} potencial total</p>}
          {nextDate ? (
            <p>
              Próxima ação:{' '}
              <span style={{ color: 'var(--amber)', fontWeight: 500 }}>{nextDate.name}</span>
            </p>
          ) : (
            calendar && <p style={{ color: 'var(--muted-foreground)' }}>Nenhuma data próxima</p>
          )}
          {onRegenerateCalendar && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRegenerateCalendar()
              }}
              disabled={isRegeneratingCalendar}
              className="text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={12} className={isRegeneratingCalendar ? 'animate-spin' : ''} />
              {isRegeneratingCalendar ? 'Regenerando...' : 'Regenerar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
