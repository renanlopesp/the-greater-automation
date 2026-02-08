'use client'

import { subMonths, startOfWeek, eachDayOfInterval, format, isAfter } from 'date-fns'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ActivityHeatmapProps {
  data: Map<string, number>
}

function getHeatmapColor(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count <= 2) return 'bg-blue-200'
  if (count <= 5) return 'bg-blue-400'
  return 'bg-blue-600'
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const today = new Date()
  const sixMonthsAgo = subMonths(today, 6)
  const gridStart = startOfWeek(sixMonthsAgo)
  const allDays = eachDayOfInterval({ start: gridStart, end: today }).filter(
    (d) => !isAfter(d, today)
  )

  // Group days into weeks (columns)
  const weeks: Date[][] = []
  let currentWeek: Date[] = []
  for (const day of allDays) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
    currentWeek.push(day)
  }
  if (currentWeek.length > 0) weeks.push(currentWeek)

  // Determine month labels
  const monthLabels: { label: string; colIndex: number }[] = []
  let lastMonth = -1
  for (let w = 0; w < weeks.length; w++) {
    const firstDayOfWeek = weeks[w][0]
    const month = firstDayOfWeek.getMonth()
    if (month !== lastMonth) {
      monthLabels.push({
        label: format(firstDayOfWeek, 'MMM'),
        colIndex: w,
      })
      lastMonth = month
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-1 overflow-x-auto">
        {/* Month labels */}
        <div className="flex" style={{ paddingLeft: 20, minWidth: 'max-content' }}>
          {monthLabels.map((m, i) => {
            const nextCol = monthLabels[i + 1]?.colIndex ?? weeks.length
            const span = nextCol - m.colIndex
            return (
              <div
                key={`${m.label}-${m.colIndex}`}
                className="text-muted-foreground text-xs"
                style={{ width: span * 14 }}
              >
                {m.label}
              </div>
            )
          })}
        </div>

        {/* Grid with day labels */}
        <div className="flex gap-1" style={{ minWidth: 'max-content' }}>
          {/* Day-of-week labels */}
          <div className="flex flex-col justify-between" style={{ width: 16 }}>
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="text-muted-foreground flex h-3 items-center text-[10px] leading-none"
              >
                {i % 2 === 1 ? label : ''}
              </div>
            ))}
          </div>

          {/* Heatmap cells */}
          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateRows: 'repeat(7, 1fr)',
              gridAutoFlow: 'column',
            }}
          >
            {allDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const count = data.get(key) ?? 0
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'hover:ring-foreground/20 h-3 w-3 rounded-sm transition-all hover:ring-1',
                        getHeatmapColor(count)
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {format(day, 'MMM d, yyyy')} -{' '}
                      {count === 0 ? 'No runs' : `${count} run${count > 1 ? 's' : ''}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
