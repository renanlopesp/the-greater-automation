'use client'

import { cn } from '@/lib/utils'

interface LogEntry {
  datetime: string
  description: string
  status: 'Done' | 'Scheduled' | 'Draft'
}

const statusColors: Record<string, string> = {
  Done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
}

const logEntries: LogEntry[] = [
  {
    datetime: 'Today 14:30',
    description: 'Sent win-back campaign to 142 VIP customers via WhatsApp',
    status: 'Done',
  },
  {
    datetime: 'Today 11:00',
    description: 'Generated delivery delay notifications for 12 orders',
    status: 'Done',
  },
  {
    datetime: 'Today 09:15',
    description: 'Analyzed 284 inactive customers — segmented by ticket value',
    status: 'Done',
  },
  {
    datetime: 'Tomorrow 08:00',
    description: 'Post-delivery review request flow — 89 customers queued',
    status: 'Scheduled',
  },
  {
    datetime: 'Pending',
    description: 'VIP thank-you campaign — awaiting approval for 23 customers',
    status: 'Draft',
  },
]

export default function AgentLog() {
  return (
    <div>
      <h2 className="text-foreground mb-4 text-lg font-medium">Agent Log</h2>
      <div className="space-y-0">
        {logEntries.map((entry, i) => (
          <div
            key={i}
            className="border-border flex items-start gap-4 border-b py-3 last:border-b-0"
          >
            <span className="text-muted-foreground mt-0.5 w-28 shrink-0 text-xs">
              {entry.datetime}
            </span>
            <p className="text-foreground flex-1 text-sm">{entry.description}</p>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                statusColors[entry.status]
              )}
            >
              {entry.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
