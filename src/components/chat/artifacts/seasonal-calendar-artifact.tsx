'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PersonalizedCalendar, PersonalizedDate } from '@/lib/ai/seasonal-campaign-generator'

// ---------------------------------------------------------------------------
// Priority dot colors
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<PersonalizedDate['priority'], string> = {
  high: '#EF4444',
  medium: '#3B82F6',
  low: '#9CA3AF',
}

function formatRevenue(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace('.0', '')}M`
  if (value >= 1_000) return `R$ ${Math.round(value / 1_000)}k`
  return `R$ ${value.toLocaleString('pt-BR')}`
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

interface CalendarRowProps {
  date: PersonalizedDate
  isLast: boolean
}

function CalendarRow({ date, isLast }: CalendarRowProps) {
  const dotColor = PRIORITY_COLORS[date.priority]

  return (
    <div
      className={cn(
        'flex cursor-pointer items-center justify-between transition-colors hover:bg-[var(--accent)]'
      )}
      style={{
        padding: '14px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      {/* Left: dot + name + date */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="shrink-0 rounded-full"
          style={{
            width: 8,
            height: 8,
            backgroundColor: dotColor,
          }}
        />
        <div className="min-w-0">
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--foreground)',
            }}
          >
            {date.name}
          </span>
          <span
            style={{
              fontSize: 14,
              color: 'var(--muted-foreground)',
              marginLeft: 6,
            }}
          >
            &middot; {date.displayDate}
          </span>
        </div>
      </div>

      {/* Right: revenue + chevron */}
      <div className="flex shrink-0 items-center gap-2 pl-3">
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--foreground)',
            whiteSpace: 'nowrap',
          }}
        >
          {formatRevenue(date.estimatedRevenue)}
        </span>
        <ChevronRight style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SeasonalCalendarArtifactProps {
  data: PersonalizedCalendar
}

export function SeasonalCalendarArtifact({ data }: SeasonalCalendarArtifactProps) {
  const { dates, year, summary } = data
  const highCount = dates.filter((d) => d.priority === 'high').length

  return (
    <div>
      {/* Title */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: 'var(--foreground)',
          marginBottom: 4,
        }}
      >
        Calendário Sazonal {year}
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 13,
          color: 'var(--muted-foreground)',
          marginBottom: 24,
        }}
      >
        {summary.totalDates} datas
        {highCount > 0 && ` · ${highCount} precisam de ação imediata`}
      </p>

      {/* Date list */}
      <div>
        {dates.map((date, index) => (
          <CalendarRow key={date.id} date={date} isLast={index === dates.length - 1} />
        ))}
      </div>
    </div>
  )
}
