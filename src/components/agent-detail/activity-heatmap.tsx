'use client'

import {
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  isToday,
  isWeekend,
} from 'date-fns'
import { cn } from '@/lib/utils'

interface ActivityHeatmapProps {
  data: Map<string, number>
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function MonthCalendar({ month, data }: { month: Date; data: Map<string, number> }) {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = eachDayOfInterval({ start, end })
  const startDayOfWeek = getDay(start)

  // Build 6-row grid (max possible weeks in a month)
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null)
  }
  for (const day of days) {
    cells.push(day)
  }
  // Fill remaining cells to complete the grid
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  return (
    <div className="flex-1">
      <h4 className="mb-2 text-center text-sm font-semibold">{format(month, 'MMMM')}</h4>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {/* Day of week headers */}
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="text-muted-foreground pb-1 text-[10px] font-semibold">
            {label}
          </div>
        ))}

        {/* Day cells */}
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} />
          }

          const key = format(day, 'yyyy-MM-dd')
          const count = data.get(key) ?? 0
          const today = isToday(day)
          const weekend = isWeekend(day)

          return (
            <div
              key={key}
              data-day-cell
              data-date={key}
              className={cn(
                'mx-auto flex h-5 w-5 items-center justify-center rounded-md text-[10px]',
                count > 0 && 'bg-primary/15 text-primary font-semibold',
                today && 'ring-foreground/60 ring-1 ring-inset',
                weekend && count === 0 && 'text-muted-foreground/60',
                !weekend && count === 0 && 'text-muted-foreground/70'
              )}
            >
              {format(day, 'd')}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const today = new Date()
  const months = [
    subMonths(today, 4),
    subMonths(today, 3),
    subMonths(today, 2),
    subMonths(today, 1),
    today,
  ]

  return (
    <div className="bg-background overflow-x-auto rounded-2xl border p-4 shadow-sm">
      <div className="grid min-w-[760px] grid-cols-5 gap-8">
        {months.map((month) => (
          <MonthCalendar key={format(month, 'yyyy-MM')} month={month} data={data} />
        ))}
      </div>
    </div>
  )
}
