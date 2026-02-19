'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface ChatSender {
  id: string
  fullName: string | null
  avatarUrl: string | null
}

interface ConversationSummary {
  id: string
  title: string | null
  createdBy: ChatSender | null
  createdAt: string | null
  updatedAt: string | null
  isActive: boolean
  messageCount: number
  participants: ChatSender[]
}

interface ConversationsResponse {
  conversations: ConversationSummary[]
  total: number
  page: number
  limit: number
}

export function useConversationHistory(agentId: string) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<ConversationsResponse>({
    queryKey: ['conversations', agentId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}/conversations?limit=50`)
      if (!res.ok) throw new Error('Failed to fetch conversations')
      return res.json()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(`/api/agents/${agentId}/conversations/${conversationId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete conversation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', agentId] })
    },
  })

  const switchMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(`/api/agents/${agentId}/conversations/${conversationId}/activate`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to switch conversation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', agentId] })
    },
  })

  return {
    conversations: data?.conversations ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error?.message ?? null,
    switchConversation: switchMutation.mutateAsync,
    isSwitching: switchMutation.isPending,
    deleteConversation: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['conversations', agentId] }),
  }
}
