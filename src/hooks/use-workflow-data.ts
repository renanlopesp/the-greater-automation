'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchWorkflowForEditor } from '@/lib/queries/workflow-editor'

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
