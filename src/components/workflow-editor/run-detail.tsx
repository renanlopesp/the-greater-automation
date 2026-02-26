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
  UserCheck,
  Send,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  useWorkflowRunDetail,
  useStartWorkflowRun,
  useApproval,
  useApprovalAction,
} from '@/hooks/use-workflow-runs'
import type { RunStepDetail } from '@/hooks/use-workflow-runs'
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
    if (!run?.completed_at && run?.status !== 'waiting') {
      const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
      return () => clearInterval(interval)
    }
  }, [run?.completed_at, run?.status])

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
    <div className="flex h-full min-h-0 flex-col">
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
          <div className="bg-destructive/10 border-destructive/20 text-destructive mt-4 flex items-start gap-2 rounded-md border p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <div className="font-medium">Run failed</div>
              <div className="text-destructive/70 mt-1">{run.error}</div>
            </div>
          </div>
        )}
        {run.status === 'waiting' && (
          <div className="bg-chart-3/10 border-chart-3/20 text-chart-3 mt-4 flex items-start gap-2 rounded-md border p-3 text-sm">
            <UserCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <div className="font-medium">Waiting for human input</div>
              <div className="text-chart-3/70 mt-1">
                This run is paused and waiting for a response before continuing.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Steps timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4">
          <h3 className="mb-4 text-sm font-semibold">Step timeline</h3>
          <div className="space-y-2">
            {run.steps.map((step, index) => (
              <div key={step.id}>
                {step.status === 'waiting_for_input' ? (
                  <ApprovalCard step={step} index={index} workflowId={workflowId} runId={runId} />
                ) : (
                  <Collapsible
                    open={expandedSteps.has(step.id)}
                    onOpenChange={() => toggleStep(step.id)}
                  >
                    <div
                      className={cn(
                        'bg-card rounded-lg border',
                        step.status === 'failed' && 'border-destructive/30 bg-destructive/5'
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
                            <div className="text-destructive mt-2 text-sm font-medium">
                              {step.error}
                            </div>
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
                              <pre className="bg-muted max-h-[400px] overflow-auto rounded-md p-3 text-xs break-all whitespace-pre-wrap">
                                {JSON.stringify(step.input, null, 2)}
                              </pre>
                            </div>
                          )}
                          {step.output && (
                            <div>
                              <div className="text-muted-foreground mb-1 text-xs font-medium">
                                Output
                              </div>
                              <pre className="bg-muted max-h-[400px] overflow-auto rounded-md p-3 text-xs break-all whitespace-pre-wrap">
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
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ApprovalCard({
  step,
  index,
  workflowId,
  runId,
}: {
  step: RunStepDetail
  index: number
  workflowId: string
  runId: string
}) {
  const { data: approval } = useApproval(workflowId, runId)
  const approvalAction = useApprovalAction(workflowId, runId)
  const [comment, setComment] = useState('')
  const [inputData, setInputData] = useState('')

  const output = step.output as {
    prompt?: string
    action_type?: string
    approval_id?: string
  } | null
  const actionType = output?.action_type || 'approval'
  const prompt = output?.prompt || 'Awaiting response...'
  const approvalId = approval?.id || output?.approval_id

  const handleApprove = async () => {
    if (!approvalId) return
    try {
      await approvalAction.mutateAsync({
        approval_id: approvalId,
        decision: actionType === 'input' ? 'input_provided' : 'approved',
        comment: comment || undefined,
        input_data: actionType === 'input' ? inputData : undefined,
      })
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  const handleReject = async () => {
    if (!approvalId) return
    try {
      await approvalAction.mutateAsync({
        approval_id: approvalId,
        decision: 'rejected',
        comment: comment || 'Rejected',
      })
    } catch (error) {
      console.error('Failed to reject:', error)
    }
  }

  return (
    <div className="bg-chart-3/10 border-chart-3/30 rounded-lg border-2 p-4">
      <div className="flex items-center gap-3">
        <UserCheck className="text-chart-3 h-5 w-5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {index + 1}. {step.step_name}
            </span>
            <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/20 text-xs">
              {actionType}
            </Badge>
          </div>
        </div>
      </div>

      <div className="bg-card border-chart-3/20 mt-3 rounded-md border p-3">
        <div className="text-foreground text-sm font-medium">{prompt}</div>
      </div>

      {approval?.include_context &&
        approval?.context_data &&
        Object.keys(approval.context_data).length > 0 && (
          <div className="mt-3">
            <div className="text-muted-foreground mb-1 text-xs font-medium">Context</div>
            <pre className="bg-muted border-chart-3/20 max-h-[200px] overflow-auto rounded-md border p-2 text-xs break-all whitespace-pre-wrap">
              {JSON.stringify(approval.context_data, null, 2)}
            </pre>
          </div>
        )}

      {actionType === 'input' ? (
        <div className="mt-3 space-y-3">
          <textarea
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder="Enter your input..."
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            rows={3}
          />
          <Button
            onClick={handleApprove}
            disabled={approvalAction.isPending || !inputData.trim()}
            size="sm"
            className="gap-2"
          >
            {approvalAction.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)..."
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={approvalAction.isPending}
              size="sm"
              className="bg-chart-2 hover:bg-chart-2/90 gap-2 text-white"
            >
              {approvalAction.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {actionType === 'review' ? 'Approve' : 'Approve'}
            </Button>
            <Button
              onClick={handleReject}
              disabled={approvalAction.isPending}
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-2"
            >
              {approvalAction.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {actionType === 'review' ? 'Request Changes' : 'Reject'}
            </Button>
          </div>
        </div>
      )}

      {approvalAction.error && (
        <div className="text-destructive mt-2 text-sm">{approvalAction.error.message}</div>
      )}
    </div>
  )
}

function StepStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="text-chart-2 h-5 w-5 flex-shrink-0" />
    case 'running':
      return <Loader2 className="text-primary h-5 w-5 flex-shrink-0 animate-spin" />
    case 'failed':
      return <XCircle className="text-destructive h-5 w-5 flex-shrink-0" />
    case 'waiting_for_input':
      return <UserCheck className="text-chart-3 h-5 w-5 flex-shrink-0" />
    default:
      return <Circle className="text-muted-foreground h-5 w-5 flex-shrink-0" />
  }
}

const RUN_STATUS_STYLES: Record<string, string> = {
  completed: 'bg-chart-2/15 text-chart-2 border-chart-2/20',
  running: 'bg-primary/15 text-primary border-primary/20',
  failed: 'bg-destructive/15 text-destructive border-destructive/20',
  pending: 'bg-muted text-muted-foreground border-border',
  waiting: 'bg-chart-3/15 text-chart-3 border-chart-3/20',
}

function RunStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', RUN_STATUS_STYLES[status] || RUN_STATUS_STYLES.pending)}
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
