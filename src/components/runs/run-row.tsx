'use client'

import Link from 'next/link'
import { TableRow, TableCell } from '@/components/ui/table'
import RunStatusBadge from '@/components/runs/run-status-badge'
import { formatDuration } from '@/lib/utils/format-duration'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'
import type { Run } from '@/lib/queries/runs'
import { cn } from '@/lib/utils'

interface RunRowProps {
  run: Run
}

export default function RunRow({ run }: RunRowProps) {
  const exactTimestamp = run.started_at ? new Date(run.started_at).toLocaleString() : undefined

  return (
    <TableRow
      className={cn(
        run.status === 'failed' &&
          'border-destructive/30 bg-destructive/5 border-l-destructive border-y border-l-2'
      )}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 52px' }}
    >
      <TableCell className="max-w-[120px] truncate font-mono text-sm">
        {run.id.slice(0, 8)}
      </TableCell>
      <TableCell>
        <Link
          href={`/workflows/${run.workflow_id}/edit`}
          className="flex max-w-[200px] items-center gap-1.5 truncate"
        >
          <span>{run.workflow_emoji ?? '📋'}</span>
          <span className="truncate text-sm">{run.workflow_name}</span>
        </Link>
      </TableCell>
      <TableCell>
        <RunStatusBadge status={run.status} />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDuration(run.started_at, run.completed_at)}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{run.steps_used}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {run.ai_credits_used.toFixed(1)}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm" title={exactTimestamp}>
        {formatRelativeTime(run.started_at)}
      </TableCell>
    </TableRow>
  )
}
