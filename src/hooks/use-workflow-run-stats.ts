'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchWorkflowRunStats, type WorkflowRunStats } from '@/lib/queries/dashboard'

export function useWorkflowRunStats(workflowIds: string[]) {
  return useQuery({
    queryKey: ['workflow-run-stats', [...workflowIds].sort().join(',')],
    queryFn: async () => {
      const supabase = createBrowserClient()
      const stats = await fetchWorkflowRunStats(supabase, workflowIds)
      // Convert Map to plain object for React Query serialization
      const result: Record<string, WorkflowRunStats> = {}
      for (const [id, stat] of stats) {
        result[id] = stat
      }
      return result
    },
    enabled: workflowIds.length > 0,
    staleTime: 30_000,
  })
}
