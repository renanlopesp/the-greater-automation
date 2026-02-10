'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Circle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Play,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useWorkflowRunDetail, useStartWorkflowRun } from '@/hooks/use-workflow-runs'
import { cn } from '@/lib/utils'

interface RunDetailProps {
  workflowId: string
  runId: string
  onBack: () => void
}

export default function RunDetail({ workflowId, runId, onBack }: RunDetailProps) {
  const { data: run, isLoading } = useWorkflowRunDetail(workflowId, runId)
  const startRun = useStartWorkflowRun(workflowId)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    if (!run?.completed_at) {
      const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
      return () => clearInterval(interval)
    }
  }, [run?.completed_at])

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const handleRetry = async () => {
    try {
      await startRun.mutateAsync()
      onBack()
    } catch (error) {
      console.error('Failed to retry run:', error)
    }
  }

  if (isLoading || !run) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    )
  }

  const duration = run.completed_at
    ? new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
    : currentTime - new Date(run.started_at).getTime()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to runs
          </Button>
        </div>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-xl font-semibold">Run {run.id.substring(0, 8)}</h2>
              <RunStatusBadge status={run.status} />
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Started {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
              </span>
              <span>Duration: {formatDuration(duration)}</span>
              <span>Trigger: {run.trigger_type}</span>
              <span>
                {run.summary.completed_steps}/{run.summary.total_steps} steps completed
              </span>
            </div>
          </div>
          {run.status === 'failed' && (
            <Button onClick={handleRetry} disabled={startRun.isPending} size="sm" className="gap-2">
              {startRun.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Retry
            </Button>
          )}
        </div>
        {run.error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <div className="font-medium">Run failed</div>
              <div className="text-muted-foreground mt-1">{run.error}</div>
            </div>
          </div>
        )}
      </div>

      {/* Steps timeline */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-4">
          <h3 className="mb-4 text-sm font-semibold">Step timeline</h3>
          <div className="space-y-2">
            {run.steps.map((step, index) => (
              <Collapsible
                key={step.id}
                open={expandedSteps.has(step.id)}
                onOpenChange={() => toggleStep(step.id)}
              >
                <div
                  className={cn(
                    'bg-card rounded-lg border',
                    step.status === 'failed' && 'border-red-300 bg-red-50'
                  )}
                >
                  <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center gap-3 p-4 text-left transition-colors">
                    <StepStatusIcon status={step.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {index + 1}. {step.step_name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {step.step_type}
                        </Badge>
                      </div>
                      {step.duration_ms && (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {formatDuration(step.duration_ms)}
                        </div>
                      )}
                      {step.error && (
                        <div className="mt-2 text-sm font-medium text-red-700">{step.error}</div>
                      )}
                    </div>
                    {expandedSteps.has(step.id) ? (
                      <ChevronUp className="text-muted-foreground h-4 w-4" />
                    ) : (
                      <ChevronDown className="text-muted-foreground h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-3 border-t px-4 py-3">
                      {step.input && (
                        <div>
                          <div className="text-muted-foreground mb-1 text-xs font-medium">
                            Input
                          </div>
                          <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
                            {JSON.stringify(step.input, null, 2)}
                          </pre>
                        </div>
                      )}
                      {step.output && (
                        <div>
                          <div className="text-muted-foreground mb-1 text-xs font-medium">
                            Output
                          </div>
                          <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
                            {JSON.stringify(step.output, null, 2)}
                          </pre>
                        </div>
                      )}
                      {!step.input && !step.output && (
                        <div className="text-muted-foreground text-xs italic">
                          No input/output data available
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function StepStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
    case 'running':
      return <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-blue-600" />
    case 'failed':
      return <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
    default:
      return <Circle className="text-muted-foreground h-5 w-5 flex-shrink-0" />
  }
}

function RunStatusBadge({ status }: { status: string }) {
  const styles = {
    completed: 'bg-green-50 text-green-700 border-green-200',
    running: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-muted text-muted-foreground border-border',
  }

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', styles[status as keyof typeof styles] || styles.pending)}
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
