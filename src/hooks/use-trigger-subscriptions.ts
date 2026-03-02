'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { getTriggerSubscriptions } from '@/lib/actions/trigger-subscriptions'
import { createBrowserClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const triggerSubscriptionsKey = (agentId: string) =>
  ['trigger-subscriptions', agentId] as const

// ---------------------------------------------------------------------------
// Hook 1: useTriggerSubscriptions(agentId)
// ---------------------------------------------------------------------------

export function useTriggerSubscriptions(agentId: string) {
  return useQuery({
    queryKey: triggerSubscriptionsKey(agentId),
    queryFn: () => getTriggerSubscriptions(agentId),
    staleTime: 30_000,
    enabled: !!agentId,
  })
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
  const [steps, setSteps] = useState<RunStep[] | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) return

    const supabase = createBrowserClient()

    // Fetch steps from workflow_run_steps (normalized table)
    async function fetchSteps() {
      const { data: runSteps } = await supabase
        .from('workflow_run_steps')
        .select(
          'step_id, step_position, step_type, status, output, error, started_at, completed_at, duration_ms'
        )
        .eq('run_id', runId!)
        .order('step_position', { ascending: true })

      if (runSteps && runSteps.length > 0) {
        // Fetch step names in parallel with the run status query below
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

        setSteps(
          runSteps.map((rs) => ({
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
        )
      }

      // Also fetch run status
      const { data: run } = await supabase
        .from('workflow_runs')
        .select('status')
        .eq('id', runId!)
        .single()
      if (run) setStatus(run.status)
    }

    fetchSteps().catch(() => {
      // Ignore errors on initial fetch
    })

    // Subscribe to realtime updates on workflow_run_steps
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
          // Re-fetch all steps on any step change (simple and correct)
          fetchSteps().catch(() => {})
        }
      )
      .subscribe()

    // Subscribe to run status changes
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
        (payload) => {
          const newData = payload.new as Record<string, unknown>
          if (typeof newData.status === 'string') {
            setStatus(newData.status)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(stepsChannel).catch(() => {})
      supabase.removeChannel(runChannel).catch(() => {})
    }
  }, [runId])

  return { steps, status }
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
