'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchAgentActivity } from '@/lib/queries/agent-activity'

/**
 * Fetches activity data for an agent (summary, KPIs, action log) for today.
 * Refetches every 60 seconds to pick up new workflow run outputs.
 */
export function useAgentActivity(agentId: string) {
  return useQuery({
    queryKey: ['agent-activity', agentId],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchAgentActivity(supabase, agentId)
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
