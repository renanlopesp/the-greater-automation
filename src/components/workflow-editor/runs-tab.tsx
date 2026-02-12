'use client'

import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Play, Clock, CheckCircle2, XCircle, Circle, Loader2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWorkflowRuns, useStartWorkflowRun } from '@/hooks/use-workflow-runs'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import RunDetail from '@/components/workflow-editor/run-detail'
import { cn } from '@/lib/utils'

interface RunsTabProps {
  workflowId: string
}

export default function RunsTab({ workflowId }: RunsTabProps) {
  const [manualSelectedRunId, setManualSelectedRunId] = useState<string | null>(null)
  const { pendingRunId, setPendingRunId } = useWorkflowEditorStore()

  const { data: runs = [], isLoading } = useWorkflowRuns(workflowId)
  const startRun = useStartWorkflowRun(workflowId)

  // Derive selected run: pendingRunId takes priority when it appears in the list
  const selectedRunId = useMemo(() => {
    if (pendingRunId) {
      const found = runs.find((r) => r.id === pendingRunId)
      if (found) return found.id
    }
    return manualSelectedRunId
  }, [pendingRunId, runs, manualSelectedRunId])

  const handleSelectRun = (runId: string) => {
    if (pendingRunId) setPendingRunId(null)
    setManualSelectedRunId(runId)
  }

  const handleRunNow = async () => {
    try {
      await startRun.mutateAsync()
    } catch (error) {
      console.error('Failed to start run:', error)
    }
  }

  const handleBackToList = () => {
    if (pendingRunId) setPendingRunId(null)
    setManualSelectedRunId(null)
  }

  if (selectedRunId) {
    return <RunDetail workflowId={workflowId} runId={selectedRunId} onBack={handleBackToList} />
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
          <Play className="text-muted-foreground h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">No runs yet</h3>
          <p className="text-muted-foreground text-sm">
            Start your first workflow run to see execution history
          </p>
        </div>
        <Button onClick={handleRunNow} disabled={startRun.isPending} className="gap-2">
          {startRun.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run now
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Run history</h2>
            <p className="text-muted-foreground text-sm">
              {runs.length} run{runs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={handleRunNow} disabled={startRun.isPending} size="sm" className="gap-2">
            {startRun.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run now
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y">
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => handleSelectRun(run.id)}
              className="hover:bg-muted/50 flex w-full items-center gap-4 px-6 py-4 text-left transition-colors"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <RunStatusIcon status={run.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{run.id.substring(0, 8)}</span>
                    <RunStatusBadge status={run.status} />
                  </div>
                  <div className="text-muted-foreground mt-1 flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                    </span>
                    <span>
                      {run.steps_completed}/{run.step_count} steps
                    </span>
                    {run.completed_at && (
                      <span>
                        {formatDuration(
                          new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="text-chart-2 h-5 w-5" />
    case 'running':
      return <Loader2 className="text-primary h-5 w-5 animate-spin" />
    case 'failed':
      return <XCircle className="text-destructive h-5 w-5" />
    case 'waiting':
      return <UserCheck className="text-chart-3 h-5 w-5" />
    default:
      return <Circle className="text-muted-foreground h-5 w-5" />
  }
}

function RunStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-chart-2/15 text-chart-2 border-chart-2/20',
    running: 'bg-primary/15 text-primary border-primary/20',
    failed: 'bg-destructive/15 text-destructive border-destructive/20',
    pending: 'bg-muted text-muted-foreground border-border',
    waiting: 'bg-chart-3/15 text-chart-3 border-chart-3/20',
  }

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', styles[status] || styles.pending)}
    >
      {status}
    </Badge>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}
