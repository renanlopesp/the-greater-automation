'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { getAgentSkills, type AgentSkillData } from '@/lib/actions/agents'

export const agentSkillsKey = (agentId: string) => ['agent-skills', agentId] as const

export function useAgentSkills(agentId: string, initialData?: AgentSkillData[]) {
  return useQuery<AgentSkillData[]>({
    queryKey: agentSkillsKey(agentId),
    queryFn: () => getAgentSkills(agentId),
    initialData,
    enabled: !!agentId,
  })
}

export function useInvalidateAgentSkills(agentId: string) {
  const queryClient = useQueryClient()
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: agentSkillsKey(agentId) })
  }, [queryClient, agentId])
}
