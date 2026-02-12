'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchWorkflowForEditor } from '@/lib/queries/workflow-editor'
import {
  saveWorkflow as saveWorkflowAction,
  publishWorkflow as publishWorkflowAction,
} from '@/lib/actions/workspace'
import type { WorkflowTrigger } from '@/lib/workflow-editor/trigger-defaults'
import type { WorkflowStep } from '@/lib/workflow-editor/step-defaults'
import type { WorkflowStatus } from '@/lib/supabase/database.types'

export function useWorkflowData(workflowId: string) {
  return useQuery({
    queryKey: ['workflow-editor', workflowId],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchWorkflowForEditor(supabase, workflowId)
    },
    staleTime: 60_000,
    enabled: !!workflowId,
  })
}

export function useSaveWorkflow(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      emoji: string
      isStarred: boolean
      trigger: WorkflowTrigger | null
      steps: WorkflowStep[]
    }) => {
      const result = await saveWorkflowAction(workflowId, {
        name: data.name,
        emoji: data.emoji,
        isStarred: data.isStarred,
        trigger: data.trigger
          ? {
              type: data.trigger.type,
              config: data.trigger.config as unknown as Record<string, unknown>,
            }
          : null,
        steps: data.steps.map((s) => ({
          type: s.type,
          name: s.name,
          position: s.position,
          config: s.config as unknown as Record<string, unknown>,
        })),
      })

      if (result.error) {
        throw new Error(result.error)
      }

      return { success: true, savedAt: result.savedAt }
    },
    onSuccess: () => {
      // Invalidate so the React Query cache stays in sync with saved data.
      // Safe with the needsInit pattern — the store won't re-initialize
      // because storeWorkflowId already matches params.id.
      queryClient.invalidateQueries({ queryKey: ['workflow-editor', workflowId] })
    },
  })
}

export function usePublishWorkflow(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (status: WorkflowStatus) => {
      const result = await publishWorkflowAction(workflowId, status)

      if (result.error) {
        throw new Error(result.error)
      }

      return { success: true, status }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-editor', workflowId] })
    },
  })
}

export function useDuplicateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await fetch(`/api/workflows/${workflowId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate workflow')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate the workflows list query when a new workflow is duplicated
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}
