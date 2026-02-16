'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkflowRunSteps, type RunStep } from '@/hooks/use-trigger-subscriptions'

export interface Run {
  id: string
  status: string
  steps_used: number
  ai_credits_used: number
  started_at: string
  completed_at: string | null
  workflow: { name: string; emoji: string } | null
  trigger_data?: Record<string, unknown> | null
  error?: string | null
  event_log_id?: string | null
  trigger_type?: string | null
}

interface RunHistoryProps {
  runs: Run[]
}

function formatTriggerLabel(triggerData: Record<string, unknown> | null | undefined): string {
  if (!triggerData) return 'Event'
  const meta = triggerData.metadata as Record<string, unknown> | undefined
  const slug = meta?.triggerSlug as string | undefined
  if (!slug) return 'Event'
  const parts = slug.split('_')
  const app = parts[0]
  const event = parts
    .slice(1)
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(' ')
  return `${app.charAt(0) + app.slice(1).toLowerCase()}: ${event}`
}

function WorkflowSteps({ steps }: { steps: RunStep[] }) {
  return (
    <div className="mb-3">
      <p className="text-foreground mb-2 text-xs font-medium">
        Steps ({steps.filter((s) => s.status === 'completed').length}/{steps.length})
      </p>
      <div className="space-y-1">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-background flex items-center gap-2 rounded border px-2 py-1.5"
          >
            <span
              className={cn('h-2 w-2 flex-shrink-0 rounded-full', {
                'bg-muted-foreground': step.status === 'pending',
                'animate-pulse bg-blue-500': step.status === 'running',
                'bg-green-500': step.status === 'completed',
                'bg-red-500': step.status === 'failed',
                'bg-muted': step.status === 'skipped',
                'animate-pulse bg-yellow-500': step.status === 'waiting_for_input',
              })}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                Step {step.step_index + 1}: {step.name}
              </p>
              {step.error && <p className="text-destructive truncate text-[10px]">{step.error}</p>}
            </div>
            {step.duration_ms != null && (
              <span className="text-muted-foreground flex-shrink-0 text-[10px]">
                {step.duration_ms < 1000 ? '<1s' : `${Math.round(step.duration_ms / 1000)}s`}
              </span>
            )}
            <span
              className={cn('flex-shrink-0 text-[10px] font-medium', {
                'text-muted-foreground': step.status === 'pending' || step.status === 'skipped',
                'text-blue-600': step.status === 'running',
                'text-green-600': step.status === 'completed',
                'text-red-600': step.status === 'failed',
                'text-yellow-600': step.status === 'waiting_for_input',
              })}
            >
              {step.status === 'waiting_for_input' ? 'waiting' : step.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-700">
          Completed
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-700">
          Failed
        </Badge>
      )
    case 'pending':
      return (
        <Badge variant="outline" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-700">
          Pending
        </Badge>
      )
    case 'running':
      return (
        <Badge variant="outline" className="border-blue-500/50 bg-blue-500/10 text-blue-700">
          Running
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
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

// Wrapper component for real-time workflow steps
function WorkflowStepsLive({ runId }: { runId: string }) {
  const { steps } = useWorkflowRunSteps(runId)
  if (!steps || steps.length === 0) return null
  return <WorkflowSteps steps={steps} />
}

export default function RunHistory({ runs }: RunHistoryProps) {
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [retryingRuns, setRetryingRuns] = useState<Set<string>>(new Set())

  function toggleExpanded(runId: string) {
    setExpandedRuns((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) {
        next.delete(runId)
      } else {
        next.add(runId)
      }
      return next
    })
  }

  async function handleRetry(runId: string) {
    setRetryingRuns((prev) => new Set(prev).add(runId))
    try {
      const { retryWorkflowRun } = await import('@/lib/actions/trigger-subscriptions')
      await retryWorkflowRun(runId)
    } catch {
      // Ignore - UI will show the result
    } finally {
      setRetryingRuns((prev) => {
        const next = new Set(prev)
        next.delete(runId)
        return next
      })
    }
  }

  // Filter runs
  const filteredRuns = runs.filter((run) => {
    if (statusFilter !== 'all' && run.status !== statusFilter) return false
    if (sourceFilter === 'event' && !run.event_log_id) return false
    if (sourceFilter === 'manual' && run.event_log_id) return false
    return true
  })

  if (runs.length === 0) {
    return (
      <div className="bg-background overflow-hidden rounded-2xl border shadow-sm">
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground text-sm">No runs yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background overflow-hidden rounded-2xl border shadow-sm">
      <div className="flex items-center gap-1.5 border-b px-4 py-2">
        {['all', 'completed', 'failed', 'running'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
              statusFilter === status
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
        <div className="bg-border mx-1 h-4 w-px" />
        {['all', 'event', 'manual'].map((source) => (
          <button
            key={source}
            type="button"
            onClick={() => setSourceFilter(source)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
              sourceFilter === source
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {source === 'all' ? 'All' : source.charAt(0).toUpperCase() + source.slice(1)}
          </button>
        ))}
      </div>
      <div className="divide-y">
        {filteredRuns.map((run) => {
          const isExpanded = expandedRuns.has(run.id)
          const name = run.workflow ? `${run.workflow.emoji} ${run.workflow.name}` : 'Unknown'

          return (
            <div key={run.id}>
              <button
                type="button"
                onClick={() => toggleExpanded(run.id)}
                className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{name}</p>
                    {run.event_log_id && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        {formatTriggerLabel(run.trigger_data)}
                      </Badge>
                    )}
                    {getStatusBadge(run.status)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                    {run.completed_at && ` • ${formatDuration(run.started_at, run.completed_at)}`}
                  </p>
                </div>
              </button>

              {isExpanded && (
                <div className="bg-muted/20 min-w-0 border-t px-4 py-3">
                  {run.error && (
                    <div className="mb-3">
                      <p className="text-destructive text-xs font-medium">Error</p>
                      <p className="text-muted-foreground mt-1 text-xs break-words">{run.error}</p>
                    </div>
                  )}
                  {run.status === 'failed' && (
                    <div className="mb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(run.id)}
                        disabled={retryingRuns.has(run.id)}
                        className="h-7 text-xs"
                      >
                        {retryingRuns.has(run.id) ? 'Retrying...' : 'Retry'}
                      </Button>
                    </div>
                  )}
                  {/* Show workflow steps — real-time for active runs, fetched for completed */}
                  <WorkflowStepsLive runId={run.id} />
                  {run.trigger_data && (
                    <div className="mb-3">
                      <p className="text-foreground text-xs font-medium">Trigger data</p>
                      <pre className="bg-background text-muted-foreground mt-1 rounded border p-2 text-xs break-all whitespace-pre-wrap">
                        {JSON.stringify(run.trigger_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {run.steps_used > 0 && (
                    <div className="mb-3">
                      <p className="text-foreground text-xs font-medium">
                        {run.steps_used} step{run.steps_used !== 1 ? 's' : ''} used
                        {run.ai_credits_used > 0 && ` • ${run.ai_credits_used} AI credits`}
                      </p>
                    </div>
                  )}
                  {!run.error && !run.trigger_data && !run.steps_used && (
                    <p className="text-muted-foreground text-xs">No additional details</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
