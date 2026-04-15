'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

type Feedback = 'like' | 'dislike' | null

interface FeedbackState {
  [messageId: string]: Feedback
}

export function useMessageFeedback(agentId: string, messageIds: string[]) {
  const queryClient = useQueryClient()
  const queryKey = ['message-feedback', agentId]

  // Fetch all feedback for current conversation's messages in one query
  const { data: feedbackMap = {} } = useQuery<FeedbackState>({
    queryKey,
    queryFn: async () => {
      if (messageIds.length === 0) return {}
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('message_feedback')
        .select('message_id, rating')
        .in('message_id', messageIds)

      const map: FeedbackState = {}
      data?.forEach((row) => {
        map[row.message_id] = row.rating as Feedback
      })
      return map
    },
    enabled: messageIds.length > 0,
  })

  const mutation = useMutation({
    mutationFn: async ({
      messageId,
      feedback,
    }: {
      messageId: string
      feedback: 'like' | 'dislike'
    }) => {
      const res = await fetch(`/api/agents/${agentId}/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      })
      if (!res.ok) throw new Error('Failed to save feedback')
      return res.json() as Promise<{ feedback: Feedback }>
    },
    onMutate: async ({ messageId, feedback }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<FeedbackState>(queryKey)

      // Optimistic update: toggle if same, otherwise set
      queryClient.setQueryData<FeedbackState>(queryKey, (old = {}) => ({
        ...old,
        [messageId]: old[messageId] === feedback ? null : feedback,
      }))

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
  })

  const toggleFeedback = useCallback(
    (messageId: string, feedback: 'like' | 'dislike') => {
      mutation.mutate({ messageId, feedback })
    },
    [mutation]
  )

  const getFeedback = useCallback(
    (messageId: string): Feedback => feedbackMap[messageId] ?? null,
    [feedbackMap]
  )

  return { getFeedback, toggleFeedback }
}
