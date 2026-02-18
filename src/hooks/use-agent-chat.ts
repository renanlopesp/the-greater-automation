'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isToolUIPart, type UIMessage } from 'ai'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { loadConversationHistory } from '@/lib/actions/agent-conversations'
import { createBrowserClient } from '@/lib/supabase/client'

const SKILL_MUTATING_TOOLS = [
  'SNEW_CREATE_SKILL',
  'SNEW_DELETE_SKILL',
  'SNEW_UPDATE_SKILL',
  'SNEW_CREATE_WORKFLOW',
  'SNEW_DELETE_WORKFLOW',
  'SNEW_UPDATE_WORKFLOW',
]

interface UseAgentChatOptions {
  onSkillMutation?: () => void
}

export function useAgentChat(
  agentId: string,
  currentUserId: string,
  options?: UseAgentChatOptions
) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const historyLoadedRef = useRef(false)
  const conversationIdRef = useRef<string | null>(null)
  const onSkillMutationRef = useRef(options?.onSkillMutation)
  onSkillMutationRef.current = options?.onSkillMutation

  // Keep ref in sync with state so the transport body closure reads latest value
  conversationIdRef.current = conversationId

  // Stable transport — recreated only when agentId changes
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/agents/${agentId}/chat`,
        body: () => ({ conversationId: conversationIdRef.current }),
        fetch: async (url, fetchOptions) => {
          const response = await globalThis.fetch(url as string, fetchOptions as RequestInit)
          // Capture conversation ID from response header
          const newConvId = response.headers.get('X-Conversation-Id')
          if (newConvId) setConversationId(newConvId)
          return response
        },
      }),
    [agentId]
  )

  // Detect completed skill-mutating tool calls and notify parent
  const onFinish = useCallback(({ message }: { message: UIMessage }) => {
    const hasSkillMutation = (message.parts ?? []).some((part) => {
      if (!isToolUIPart(part)) return false
      const toolName =
        part.type === 'dynamic-tool'
          ? (part as { toolName: string }).toolName
          : part.type.replace(/^tool-/, '')
      return SKILL_MUTATING_TOOLS.includes(toolName)
    })
    if (hasSkillMutation) {
      onSkillMutationRef.current?.()
    }
  }, [])

  // Vercel AI SDK v6 useChat hook — expose raw UIMessages
  const {
    messages,
    status,
    error: chatError,
    sendMessage: aiSendMessage,
    setMessages,
    stop,
  } = useChat({ transport, onFinish })

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
              metadata: (
                m as {
                  sender_id?: string | null
                  sender_name?: string | null
                  sender_avatar?: string | null
                }
              ).sender_id
                ? {
                    senderId: (m as { sender_id?: string | null }).sender_id,
                    senderName: (m as { sender_name?: string | null }).sender_name,
                    senderAvatar: (m as { sender_avatar?: string | null }).sender_avatar,
                  }
                : undefined,
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

  // Subscribe to new messages from other users via Realtime
  useEffect(() => {
    if (!conversationId) return

    const supabase = createBrowserClient()
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as {
            id: string
            role: string
            content: string
            sender_id: string | null
            created_at: string | null
          }
          // Only add messages from other users (our own messages are already in state)
          if (newMsg.sender_id && newMsg.sender_id !== currentUserId) {
            const uiMessage: UIMessage = {
              id: newMsg.id,
              role: newMsg.role as 'user' | 'assistant',
              parts: [{ type: 'text', text: newMsg.content }],
              metadata: {
                senderId: newMsg.sender_id,
              },
            }
            setMessages((prev) => [...prev, uiMessage])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, setMessages])

  // Subscribe to active conversation changes (when another user starts a new chat)
  useEffect(() => {
    const supabase = createBrowserClient()
    const channel = supabase
      .channel(`conversations:agent:${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_conversations',
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; is_active: boolean }
          if (updated.is_active && updated.id !== conversationIdRef.current) {
            // Another user activated a different conversation — reload history
            historyLoadedRef.current = false
            setConversationId(null)
            setMessages([])
            setIsLoadingHistory(true)

            loadConversationHistory(agentId)
              .then((result) => {
                if (result) {
                  setConversationId(result.conversationId)
                  const loaded: UIMessage[] = result.messages
                    .filter((m) => m.role === 'user' || m.role === 'assistant')
                    .map((m) => ({
                      id: m.id,
                      role: m.role as 'user' | 'assistant',
                      parts: [{ type: 'text' as const, text: m.content }],
                      metadata: (m as { sender_id?: string | null }).sender_id
                        ? {
                            senderId: (m as { sender_id?: string | null }).sender_id,
                            senderName: (m as { sender_name?: string | null }).sender_name,
                            senderAvatar: (m as { sender_avatar?: string | null }).sender_avatar,
                          }
                        : undefined,
                    }))
                  setMessages(loaded)
                }
              })
              .catch((err) => console.error('Failed to reload conversation:', err))
              .finally(() => setIsLoadingHistory(false))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [agentId, setMessages])

  // Send message using v6 sendMessage API (supports optional file attachments)
  const sendMessage = useCallback(
    async (text: string, files?: import('ai').FileUIPart[]) => {
      if (files && files.length > 0) {
        await aiSendMessage({ text, files })
      } else {
        await aiSendMessage({ text })
      }
    },
    [aiSendMessage]
  )

  // Start a fresh conversation — clears messages and resets conversationId
  const startNewChat = useCallback(() => {
    setConversationId(null)
    conversationIdRef.current = null
    setMessages([])
  }, [setMessages])

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
    startNewChat,
    stop,
    setMessages,
  }
}
