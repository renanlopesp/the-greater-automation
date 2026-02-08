'use client'

import Link from 'next/link'
import StatusBadge from '@/components/shared/status-badge'
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
  return (
    <Link
      href={`/workflows/${workflow.id}/edit`}
      className="hover:bg-muted/50 flex items-center gap-4 rounded-lg px-4 py-3"
    >
      <span className="text-lg">{workflow.emoji ?? '📋'}</span>
      <StatusBadge status={workflow.status === 'published' ? 'published' : 'draft'} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{workflow.name}</span>
      <span className="text-muted-foreground text-xs">
        {formatRelativeTime(workflow.updated_at ?? workflow.created_at)}
      </span>
      <span className="text-muted-foreground w-12 text-right text-xs">{totalRuns} runs</span>
      <ActivitySparkline data={sparklineData} />
      <span className="text-muted-foreground w-20 text-right text-xs">
        {formatRelativeTime(lastRunAt)}
      </span>
    </Link>
  )
}
