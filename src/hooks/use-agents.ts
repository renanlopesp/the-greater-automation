'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchAgentsWithSkills } from '@/lib/queries/dashboard'

type AgentWithSkills = Awaited<ReturnType<typeof fetchAgentsWithSkills>>[number]

export function useAgents(teamId: string, initialData: AgentWithSkills[]) {
  return useQuery({
    queryKey: ['agents', teamId],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchAgentsWithSkills(supabase, teamId)
    },
    initialData,
    staleTime: 30_000,
  })
}
