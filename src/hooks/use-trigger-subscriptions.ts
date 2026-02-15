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
// Hook 2: usePipelineRunSteps(runId)
// ---------------------------------------------------------------------------

interface PipelineStep {
  step_index: number
  action_type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  output?: Record<string, unknown>
  error?: string
  started_at?: string
  completed_at?: string
  duration_ms?: number
}

export function usePipelineRunSteps(runId: string | null) {
  const [steps, setSteps] = useState<PipelineStep[] | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) return

    const supabase = createBrowserClient()

    // Initial fetch
    Promise.resolve(
      supabase.from('agent_workflow_runs').select('pipeline_steps, status').eq('id', runId).single()
    )
      .then(({ data }) => {
        if (data) {
          setSteps(
            Array.isArray(data.pipeline_steps)
              ? (data.pipeline_steps as unknown as PipelineStep[])
              : null
          )
          setStatus(data.status)
        }
      })
      .catch(() => {
        // Ignore errors on initial fetch
      })

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_workflow_runs',
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          const newData = payload.new as Record<string, unknown>
          if (Array.isArray(newData.pipeline_steps)) {
            setSteps(newData.pipeline_steps as unknown as PipelineStep[])
          }
          if (typeof newData.status === 'string') {
            setStatus(newData.status)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel).catch(() => {
        // Ignore cleanup errors
      })
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
