'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchRuns, type FetchRunsResult } from '@/lib/queries/runs'

interface UseRunsFilters {
  status?: string
  workflowId?: string
}

export function useRuns(teamId: string, filters: UseRunsFilters, initialData: FetchRunsResult) {
  const supabase = createBrowserClient()

  return useInfiniteQuery({
    queryKey: ['runs', teamId, filters],
    queryFn: async ({ pageParam }) => {
      return fetchRuns(supabase, teamId, {
        cursor: pageParam ?? undefined,
        status: filters.status,
        workflowId: filters.workflowId,
      })
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: {
      pages: [initialData],
      pageParams: [null],
    },
    staleTime: 10_000,
    refetchInterval: (query) => {
      const allRuns = query.state.data?.pages.flatMap((p) => p.data) ?? []
      const hasActive = allRuns.some((r) => r.status === 'pending' || r.status === 'running')
      return hasActive ? 10_000 : false
    },
  })
}
