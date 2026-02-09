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
        <div className="relative mb-4 h-20 w-28">
          <div className="border-primary/15 bg-background/40 absolute inset-x-2 top-0 h-14 rounded-xl border-2" />
          <div className="border-primary/20 bg-background/60 absolute inset-x-1 top-2 h-14 rounded-xl border-2" />
          <div className="border-primary/25 bg-background absolute inset-x-0 top-4 h-14 rounded-xl border-2 shadow-sm" />

          <div className="bg-primary/30 absolute top-9 left-4 h-2 w-14 rounded-full" />
          <div className="bg-primary/35 absolute top-9 right-4 h-2 w-2 rounded-full" />
          <div className="bg-muted-foreground/20 absolute top-13 left-4 h-2 w-10 rounded-full" />
        </div>
        <p className="text-foreground text-sm font-medium">No runs yet.</p>
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
          <div className="text-muted-foreground ml-auto flex shrink-0 items-center gap-6 text-xs">
            <span className={cn('w-12 text-right', !run.completed_at && 'opacity-0')}>
              {run.completed_at ? formatDuration(run.started_at, run.completed_at) : '0s'}
            </span>
            <span className="w-28 text-right">
              {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
