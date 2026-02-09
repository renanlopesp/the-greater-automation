'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import ActivitySparkline from '@/components/dashboard/activity-sparkline'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'

export interface WorkflowListItemProps {
  workflow: {
    id: string
    name: string
    emoji: string | null
    status: string
    updated_at: string | null
    created_at: string
  }
  totalRuns?: number
  lastRunAt?: string | null
  sparklineData?: { day: number; count: number }[]
}

export default function WorkflowListItem({
  workflow,
  totalRuns = 0,
  lastRunAt = null,
  sparklineData = [],
}: WorkflowListItemProps) {
  const edited = formatRelativeTime(workflow.updated_at ?? workflow.created_at)
  const lastRun = lastRunAt ? formatRelativeTime(lastRunAt) : 'No runs completed yet'

  return (
    <Link href={`/workflows/${workflow.id}/edit`} className="group flex items-center gap-3">
      {/* Text columns area */}
      <span className="flex min-w-0 flex-1 items-center gap-6 py-4">
        {/* Name/status/edited column */}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            {workflow.status === 'published' ? (
              <Badge className="text-[10px]">Published</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Draft
              </Badge>
            )}
            <span className="truncate text-sm font-medium group-hover:underline">
              {workflow.name}
            </span>
          </span>
          <span className="text-muted-foreground text-xs">Edited {edited}</span>
        </span>

        {/* Total runs */}
        <span className="hidden shrink-0 flex-col gap-1 md:flex" style={{ width: 100 }}>
          <span className="text-muted-foreground text-xs">Total runs</span>
          <span className="text-muted-foreground text-sm">{totalRuns}</span>
        </span>

        {/* Activity sparkline */}
        <span className="hidden shrink-0 flex-col gap-1 md:flex" style={{ width: 100 }}>
          <span className="text-muted-foreground text-xs">Activity</span>
          <ActivitySparkline data={sparklineData} />
        </span>

        {/* Last run */}
        <span className="flex min-w-0 flex-1 flex-row items-center justify-between gap-2">
          <span className="text-muted-foreground shrink-0 text-xs">Last run</span>
          <span className="text-muted-foreground truncate text-sm">{lastRun}</span>
        </span>
      </span>
    </Link>
  )
}
