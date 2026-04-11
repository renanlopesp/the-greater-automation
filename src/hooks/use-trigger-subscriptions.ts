'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

function triggerSubscriptionsKey(agentId: string) {
  return ['trigger-subscriptions', agentId]
}

// ---------------------------------------------------------------------------
// Hook 2: useWorkflowRunSteps(runId) — unified run step tracking
// ---------------------------------------------------------------------------

export interface RunStep {
  step_index: number
  action_type: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting_for_input'
  output?: Record<string, unknown>
  error?: string | null
  started_at?: string | null
  completed_at?: string | null
  duration_ms?: number | null
}

/** @deprecated Use useWorkflowRunSteps instead */
export const usePipelineRunSteps = useWorkflowRunSteps

export function useWorkflowRunSteps(runId: string | null) {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['workflow-run-steps', runId],
    queryFn: async () => {
      const supabase = createBrowserClient()

      const [stepsRes, runRes] = await Promise.all([
        supabase
          .from('workflow_run_steps')
          .select(
            'step_id, step_position, step_type, status, output, error, started_at, completed_at, duration_ms'
          )
          .eq('run_id', runId!)
          .order('step_position', { ascending: true }),
        supabase.from('workflow_runs').select('status').eq('id', runId!).single(),
      ])

      const runSteps = stepsRes.data ?? []
      let steps: RunStep[] = []

      if (runSteps.length > 0) {
        const stepIds = runSteps.map((rs) => rs.step_id).filter(Boolean) as string[]
        const stepNames: Record<string, string> = {}
        if (stepIds.length > 0) {
          const { data: wsData } = await supabase
            .from('workflow_steps')
            .select('id, name')
            .in('id', stepIds)
          for (const ws of wsData ?? []) {
            stepNames[ws.id] = ws.name
          }
        }

        steps = runSteps.map((rs) => ({
          step_index: rs.step_position,
          action_type: rs.step_type,
          name: (rs.step_id && stepNames[rs.step_id]) || `Step ${rs.step_position + 1}`,
          status: rs.status as RunStep['status'],
          output: rs.output as Record<string, unknown> | undefined,
          error: rs.error,
          started_at: rs.started_at,
          completed_at: rs.completed_at,
          duration_ms: rs.duration_ms,
        }))
      }

      return { steps, status: runRes.data?.status ?? null }
    },
    enabled: !!runId,
    staleTime: 5_000,
  })

  // Realtime subscriptions — invalidate query instead of manual setState
  useEffect(() => {
    if (!runId) return

    const supabase = createBrowserClient()

    const stepsChannel = supabase
      .channel(`run-steps-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_run_steps',
          filter: `run_id=eq.${runId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['workflow-run-steps', runId] })
        }
      )
      .subscribe()

    const runChannel = supabase
      .channel(`run-status-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_runs',
          filter: `id=eq.${runId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['workflow-run-steps', runId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(stepsChannel).catch(() => {})
      supabase.removeChannel(runChannel).catch(() => {})
    }
  }, [runId, queryClient])

  return { steps: data?.steps ?? null, status: data?.status ?? null }
}

// ---------------------------------------------------------------------------
// Hook 3: useInvalidateTriggerSubscriptions
// ---------------------------------------------------------------------------

export function useInvalidateTriggerSubscriptions(agentId: string) {
  const queryClient = useQueryClient()
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: triggerSubscriptionsKey(agentId) })
  }, [queryClient, agentId])
}
