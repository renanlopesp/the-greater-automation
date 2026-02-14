'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { loadConversationHistory } from '@/lib/actions/agent-conversations'

export function useAgentChat(agentId: string) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const historyLoadedRef = useRef(false)
  const conversationIdRef = useRef<string | null>(null)

  // Keep ref in sync with state so the transport body closure reads latest value
  conversationIdRef.current = conversationId

  // Stable transport — recreated only when agentId changes
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/agents/${agentId}/chat`,
        body: () => ({ conversationId: conversationIdRef.current }),
        fetch: async (url, options) => {
          const response = await globalThis.fetch(url as string, options as RequestInit)
          // Capture conversation ID from response header
          const newConvId = response.headers.get('X-Conversation-Id')
          if (newConvId) setConversationId(newConvId)
          return response
        },
      }),
    [agentId]
  )

  // Vercel AI SDK v6 useChat hook — expose raw UIMessages
  const {
    messages,
    status,
    error: chatError,
    sendMessage: aiSendMessage,
    setMessages,
    stop,
  } = useChat({ transport })

  // Load conversation history on mount
  useEffect(() => {
    if (historyLoadedRef.current) return
    historyLoadedRef.current = true

    async function loadHistory() {
      try {
        setIsLoadingHistory(true)
        const result = await loadConversationHistory(agentId)
        if (result) {
          setConversationId(result.conversationId)
          const loaded: UIMessage[] = result.messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              parts: [{ type: 'text' as const, text: m.content }],
            }))
          setMessages(loaded)
        }
      } catch (err) {
        console.error('Failed to load conversation history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadHistory()
  }, [agentId, setMessages])

  // Send message using v6 sendMessage API
  const sendMessage = useCallback(
    async (text: string) => {
      await aiSendMessage({ text })
    },
    [aiSendMessage]
  )

  const isStreaming = status === 'streaming'
  const isLoading = status === 'submitted' || isStreaming

  return {
    messages,
    status,
    isLoading,
    isStreaming,
    isLoadingHistory,
    error: chatError?.message ?? null,
    conversationId,
    sendMessage,
    stop,
  }
}
