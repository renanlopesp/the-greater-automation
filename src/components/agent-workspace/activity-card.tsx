'use client'

import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/language-context'

export interface ActivityItem {
  id: string
  problem: string
  suggestion: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Pending' | 'In Progress' | 'Done'
}

const priorityClass: Record<string, string> = {
  High: 'text-red-600 dark:text-red-400',
  Medium: 'text-foreground',
  Low: 'text-muted-foreground',
}

const statusClass: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

interface ActivityCardProps {
  item: ActivityItem
}

export default function ActivityCard({ item }: ActivityCardProps) {
  const { t } = useLanguage()

  return (
    <div className="border-border bg-background space-y-3 rounded-xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-foreground text-sm leading-snug font-medium">{item.problem}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn('text-[11px] font-medium', priorityClass[item.priority])}>
            {item.priority}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              statusClass[item.status]
            )}
          >
            {item.status}
          </span>
        </div>
      </div>
      <p className="text-muted-foreground text-[13px] leading-relaxed">{item.suggestion}</p>
      {item.status === 'Pending' && (
        <div className="flex items-center gap-3 pt-1">
          <button className="text-foreground text-xs font-medium hover:underline">
            {t('agent.approveAction')}
          </button>
          <button className="text-muted-foreground hover:text-foreground text-xs">
            {t('agent.dismiss')}
          </button>
        </div>
      )}
    </div>
  )
}
