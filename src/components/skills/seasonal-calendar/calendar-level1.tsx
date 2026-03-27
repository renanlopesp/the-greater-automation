'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSeasonalDates, type SeasonalDate } from '@/data/campaign-data'

interface CalendarLevel1Props {
  onSelectDate: (date: SeasonalDate) => void
}

function statusConfig(status: SeasonalDate['status']): {
  label: string
  bg: string
  color: string
} {
  switch (status) {
    case 'done':
      return {
        label: 'Concluído',
        bg: 'var(--muted)',
        color: 'var(--muted-foreground)',
      }
    case 'active':
      return {
        label: 'Ativo',
        bg: 'var(--green-bg)',
        color: 'var(--green)',
      }
    case 'ready':
      return {
        label: 'Pronto',
        bg: 'var(--green-bg)',
        color: 'var(--green)',
      }
    case 'pending':
      return {
        label: 'Pendente',
        bg: 'var(--amber-bg)',
        color: 'var(--amber)',
      }
  }
}

export function CalendarLevel1({ onSelectDate }: CalendarLevel1Props) {
  const dates = getSeasonalDates()

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="border-border border-b px-5 py-3"
        style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
      >
        15 datas · 2 ativas · 3 pendentes · R$ 548k potencial
      </div>

      {/* List */}
      <div className="flex flex-col">
        {dates.map((date, index) => {
          const badge = statusConfig(date.status)
          const isLast = index === dates.length - 1

          return (
            <button
              key={date.id}
              onClick={() => onSelectDate(date)}
              className={cn(
                'flex w-full items-center gap-4 px-5 py-4 text-left',
                'hover:bg-muted/50 cursor-pointer transition-colors duration-100',
                !isLast && 'border-border border-b'
              )}
            >
              {/* Month + Day */}
              <div className="flex w-9 flex-shrink-0 flex-col items-center">
                <span
                  className="leading-none uppercase"
                  style={{ fontSize: 11, color: 'var(--muted-foreground)' }}
                >
                  {date.month}
                </span>
                <span
                  className="text-foreground leading-tight font-medium"
                  style={{ fontSize: 22 }}
                >
                  {date.day}
                </span>
              </div>

              {/* Name + potential */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-foreground truncate text-sm leading-snug font-medium">
                  {date.name}
                </span>
                <span
                  className="leading-snug"
                  style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
                >
                  {date.potentialValue}
                </span>
              </div>

              {/* Status badge + chevron */}
              <div className="flex flex-shrink-0 items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 font-medium"
                  style={{
                    fontSize: 11,
                    background: badge.bg,
                    color: badge.color,
                    fontWeight: 500,
                  }}
                >
                  {badge.label}
                </span>
                <ChevronRight className="text-muted-foreground" size={16} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
