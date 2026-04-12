'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { FullCampaign } from '@/data/campaign-data'
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
import type { UseMutationResult } from '@tanstack/react-query'
import { StatusBadge } from './shared'

type DateStatus = 'generated' | 'upcoming' | 'past'

interface CalendarLevel1Props {
  dates: PersonalizedDate[]
  campaigns: Record<string, FullCampaign>
  isLoadingCalendar: boolean
  calendar: PersonalizedCalendar | null
  generateCalendar: UseMutationResult<unknown, Error, number | undefined>
  onSelectDate: (date: PersonalizedDate) => void
}

function deriveDateStatus(
  date: PersonalizedDate,
  campaigns: Record<string, FullCampaign>
): DateStatus {
  if (campaigns[date.id]) return 'generated'
  if (new Date(date.date) >= new Date()) return 'upcoming'
  return 'past'
}

function statusToDisplayStatus(s: DateStatus): 'done' | 'active' | 'ready' | 'pending' {
  switch (s) {
    case 'generated':
      return 'active'
    case 'upcoming':
      return 'pending'
    case 'past':
      return 'done'
  }
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatRevenue(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${Math.round(value / 1_000)}k`
  return `R$ ${value.toLocaleString('pt-BR')}`
}

export function CalendarLevel1({
  dates,
  campaigns,
  isLoadingCalendar,
  calendar,
  generateCalendar,
  onSelectDate,
}: CalendarLevel1Props) {
  const totalDates = dates.length
  const generatedCount = dates.filter((d) => campaigns[d.id]).length
  const totalRevenue = calendar?.summary.totalPotentialRevenue ?? 0

  // --- Loading skeleton ---
  if (isLoadingCalendar) {
    return (
      <div className="flex flex-col">
        <div className="border-border border-b px-5 py-3">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-col">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={cn('flex items-center gap-4 px-5 py-4', i < 6 && 'border-border border-b')}
            >
              <div className="flex w-9 flex-shrink-0 flex-col items-center gap-1">
                <Skeleton className="h-3 w-7" />
                <Skeleton className="h-6 w-6" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // --- Empty state (no dates yet) ---
  if (dates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
        <span className="text-3xl">📅</span>
        <p className="text-foreground text-sm font-medium">Nenhuma data gerada</p>
        <p className="text-muted-foreground text-sm">O calendário ainda não foi gerado.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="border-border border-b px-5 py-3"
        style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
      >
        {totalDates} datas · {generatedCount} geradas · {formatRevenue(totalRevenue)} potencial
      </div>

      {/* List */}
      <div className="flex flex-col">
        {dates.map((date, index) => {
          const isLast = index === dates.length - 1
          const derivedStatus = deriveDateStatus(date, campaigns)
          const displayStatus = statusToDisplayStatus(derivedStatus)
          const days = derivedStatus === 'upcoming' ? daysUntil(date.date) : null

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

              {/* Name + potential + type/countdown */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-foreground truncate text-sm leading-snug font-medium">
                  {date.name}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="leading-snug"
                    style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
                  >
                    {date.potentialValue}
                  </span>
                  {date.type === 'niche' && (
                    <span
                      className="rounded px-1 leading-snug"
                      style={{
                        fontSize: 11,
                        background: 'var(--muted)',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      nicho
                    </span>
                  )}
                  {days !== null && days >= 0 && days <= 60 && (
                    <span style={{ fontSize: 12, color: 'var(--amber)' }}>
                      em {days} {days === 1 ? 'dia' : 'dias'}
                    </span>
                  )}
                </div>
              </div>

              {/* Status badge + chevron */}
              <div className="flex flex-shrink-0 items-center gap-2">
                <StatusBadge status={displayStatus} />
                <ChevronRight className="text-muted-foreground" size={16} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Next year banner */}
      {calendar?.nextYearSuggested && (
        <div className="border-border border-t px-5 py-4">
          <p style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
            A maioria das suas datas de {calendar.year} já passou.
          </p>
          <button
            onClick={() => generateCalendar.mutate(calendar.year + 1)}
            className={cn(
              'mt-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-foreground text-background hover:opacity-90'
            )}
          >
            Gerar Calendário {calendar.year + 1}
          </button>
        </div>
      )}
    </div>
  )
}
