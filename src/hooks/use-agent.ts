'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchAgent } from '@/lib/queries/agents'

export function useAgent(agentId: string) {
  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchAgent(supabase, agentId)
    },
    staleTime: 30_000,
  })
}
