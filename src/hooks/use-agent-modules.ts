'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchAgentModulesWithStatus } from '@/lib/queries/agent-activity'

/**
 * Fetches all modules for an agent with computed status (active/paused/requires_connection).
 * Refetches every 60 seconds to reflect connection changes.
 */
export function useAgentModules(agentId: string) {
  return useQuery({
    queryKey: ['agent-modules', agentId],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchAgentModulesWithStatus(supabase, agentId)
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
