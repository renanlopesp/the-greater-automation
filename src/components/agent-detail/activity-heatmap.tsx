'use client'

import {
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
    <div>
      <h4 className="mb-2 text-center text-sm font-semibold">{format(month, 'MMMM yyyy')}</h4>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
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
                'mx-auto flex h-7 w-7 items-center justify-center rounded-md text-xs',
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

  return (
    <div className="bg-background rounded-xl border p-4 shadow-sm">
      <MonthCalendar month={today} data={data} />
    </div>
  )
}
