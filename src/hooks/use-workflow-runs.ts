'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { startWorkflowRun as startWorkflowRunAction } from '@/lib/actions/workspace'

// Type definitions
export interface RunSummary {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: string
  completed_at: string | null
  trigger_type: string
  step_count: number
  steps_completed: number
  progress: {
    total: number
    completed: number
    failed: number
    running: number
    pending: number
  }
}

export interface RunStepDetail {
  id: string
  step_name: string
  step_type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: string | null
  completed_at: string | null
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error: string | null
  duration_ms: number | null
  step_position: number
}

export interface RunDetail extends Omit<RunSummary, 'step_count' | 'steps_completed'> {
  workflow_id: string
  workflow_name: string
  trigger_data: Record<string, unknown> | null
  steps_used: number
  ai_credits_used: number
  error: string | null
  created_at: string
  steps: RunStepDetail[]
  summary: {
    total_steps: number
    completed_steps: number
    failed_steps: number
    running_steps: number
    pending_steps: number
    total_duration_ms: number
  }
}

interface RunsListResponse {
  runs: Array<{
    id: string
    status: string
    trigger_type: string
    started_at: string
    completed_at: string | null
    progress: {
      total: number
      completed: number
      failed: number
      running: number
      pending: number
    }
  }>
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

interface RunDetailResponse {
  run: {
    id: string
    workflow_id: string
    workflow_name: string
    status: string
    trigger_type: string
    trigger_data: Record<string, unknown> | null
    steps_used: number
    ai_credits_used: number
    error: string | null
    started_at: string
    completed_at: string | null
    created_at: string
  }
  steps: Array<{
    id: string
    step_name: string
    step_type: string
    status: string
    started_at: string | null
    completed_at: string | null
    input: Record<string, unknown> | null
    output: Record<string, unknown> | null
    error: string | null
    duration_ms: number | null
    step_position: number
  }>
  summary: {
    total_steps: number
    completed_steps: number
    failed_steps: number
    running_steps: number
    pending_steps: number
    total_duration_ms: number
  }
}

/**
 * Hook to fetch workflow runs list with smart auto-polling.
 * Polls every 2s while any run is pending/running, stops when all are terminal.
 */
export function useWorkflowRuns(workflowId: string) {
  return useQuery<RunSummary[]>({
    queryKey: ['workflow-runs', workflowId],
    queryFn: async () => {
      const response = await fetch(`/api/workflows/${workflowId}/runs?limit=50&offset=0`)
      if (!response.ok) {
        throw new Error('Failed to fetch workflow runs')
      }
      const data: RunsListResponse = await response.json()
      return data.runs.map((run) => ({
        id: run.id,
        status: run.status as RunSummary['status'],
        started_at: run.started_at,
        completed_at: run.completed_at,
        trigger_type: run.trigger_type,
        step_count: run.progress.total,
        steps_completed: run.progress.completed,
        progress: run.progress,
      }))
    },
    enabled: !!workflowId,
    refetchInterval: (query) => {
      const runs = query.state.data
      if (!runs) return false
      const hasActive = runs.some((r) => r.status === 'running' || r.status === 'pending')
      return hasActive ? 2000 : false
    },
  })
}

/**
 * Hook to fetch a single workflow run detail with smart auto-polling.
 * Polls every 2s while the run is pending/running, stops when terminal.
 */
export function useWorkflowRunDetail(workflowId: string, runId: string | null) {
  return useQuery<RunDetail>({
    queryKey: ['workflow-run-detail', workflowId, runId],
    queryFn: async () => {
      if (!runId) throw new Error('Run ID is required')
      const response = await fetch(`/api/workflows/${workflowId}/runs/${runId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch workflow run detail')
      }
      const data: RunDetailResponse = await response.json()
      return {
        id: data.run.id,
        workflow_id: data.run.workflow_id,
        workflow_name: data.run.workflow_name,
        status: data.run.status as RunDetail['status'],
        started_at: data.run.started_at,
        completed_at: data.run.completed_at,
        trigger_type: data.run.trigger_type,
        trigger_data: data.run.trigger_data,
        steps_used: data.run.steps_used,
        ai_credits_used: data.run.ai_credits_used,
        error: data.run.error,
        created_at: data.run.created_at,
        step_count: data.summary.total_steps,
        steps_completed: data.summary.completed_steps,
        progress: {
          total: data.summary.total_steps,
          completed: data.summary.completed_steps,
          failed: data.summary.failed_steps,
          running: data.summary.running_steps,
          pending: data.summary.pending_steps,
        },
        steps: data.steps.map((step) => ({
          id: step.id,
          step_name: step.step_name,
          step_type: step.step_type,
          status: step.status as RunStepDetail['status'],
          started_at: step.started_at,
          completed_at: step.completed_at,
          input: step.input,
          output: step.output,
          error: step.error,
          duration_ms: step.duration_ms,
          step_position: step.step_position,
        })),
        summary: data.summary,
      }
    },
    enabled: !!workflowId && !!runId,
    refetchInterval: (query) => {
      const run = query.state.data
      if (!run) return false
      return run.status === 'running' || run.status === 'pending' ? 2000 : false
    },
  })
}

/**
 * Hook to start a workflow run.
 * Creates DB records via server action (fast), then fires off background execution.
 */
export function useStartWorkflowRun(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await startWorkflowRunAction(workflowId)

      if (result.error) {
        throw new Error(result.error)
      }

      // Fire-and-forget: trigger background execution
      fetch(`/api/workflows/${workflowId}/runs/${result.runId}/execute`, {
        method: 'POST',
      }).catch(console.error)

      return { runId: result.runId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-runs', workflowId] })
    },
  })
}
