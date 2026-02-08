'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchWorkspaceItems, type WorkspaceItem } from '@/lib/queries/workspace'

export function useWorkspaceItems(teamId: string, initialData: WorkspaceItem[]) {
  return useQuery({
    queryKey: ['workspace-items', teamId],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchWorkspaceItems(supabase, teamId)
    },
    initialData,
    staleTime: 30_000,
  })
}
