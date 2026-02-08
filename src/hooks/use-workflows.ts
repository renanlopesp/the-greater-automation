'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchWorkflows, type DashboardTab } from '@/lib/queries/dashboard'

type Workflow = Awaited<ReturnType<typeof fetchWorkflows>>[number]

export function useWorkflows(teamId: string, tab: DashboardTab, initialData: Workflow[]) {
  return useQuery({
    queryKey: ['workflows', teamId, tab],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchWorkflows(supabase, teamId, tab)
    },
    initialData,
    staleTime: 30_000,
  })
}
