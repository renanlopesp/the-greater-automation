import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Run {
  id: string
  status: string
  steps_used: number
  ai_credits_used: number
  started_at: string
  completed_at: string | null
  workflow: { name: string; emoji: string } | null
}

interface RunHistoryProps {
  runs: Run[]
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'running':
      return 'secondary'
    case 'failed':
      return 'destructive'
    default:
      return 'outline'
  }
}

function formatDuration(startedAt: string, completedAt: string): string {
  const start = new Date(startedAt).getTime()
  const end = new Date(completedAt).getTime()
  const diffMs = end - start

  if (diffMs < 1000) return '<1s'
  if (diffMs < 60_000) return `${Math.round(diffMs / 1000)}s`
  if (diffMs < 3_600_000) return `${Math.round(diffMs / 60_000)}m`
  return `${Math.round(diffMs / 3_600_000)}h`
}

export default function RunHistory({ runs }: RunHistoryProps) {
  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative mb-4 h-16 w-24">
          <div className="bg-muted/50 absolute inset-x-2 top-0 h-12 rounded-lg border" />
          <div className="bg-muted/70 absolute inset-x-1 top-1 h-12 rounded-lg border" />
          <div className="bg-muted absolute inset-x-0 top-2 h-12 rounded-lg border" />
        </div>
        <p className="text-muted-foreground text-sm">No runs yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div
          key={run.id}
          className={cn(
            'hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2 transition-colors'
          )}
        >
          <Badge variant={getStatusVariant(run.status)} className="shrink-0">
            {run.status}
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">
              {run.workflow?.emoji ?? '⚡'} {run.workflow?.name ?? 'Unknown workflow'}
            </p>
          </div>
          {run.completed_at && (
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatDuration(run.started_at, run.completed_at)}
            </span>
          )}
          <span className="text-muted-foreground shrink-0 text-xs">
            {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  )
}
