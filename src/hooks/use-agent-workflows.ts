'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { getAgentWorkflows, type AgentWorkflowData } from '@/lib/actions/agent-workflows'

export const agentWorkflowsKey = (agentId: string) => ['agent-workflows', agentId] as const

export function useAgentWorkflows(agentId: string, initialData?: AgentWorkflowData[]) {
  return useQuery<AgentWorkflowData[]>({
    queryKey: agentWorkflowsKey(agentId),
    queryFn: () => getAgentWorkflows(agentId),
    initialData,
    enabled: !!agentId,
  })
}

export function useInvalidateAgentWorkflows(agentId: string) {
  const queryClient = useQueryClient()
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: agentWorkflowsKey(agentId) })
  }, [queryClient, agentId])
}
