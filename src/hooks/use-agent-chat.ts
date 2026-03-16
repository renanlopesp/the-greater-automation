'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isToolUIPart, type UIMessage } from 'ai'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { loadConversationHistory } from '@/lib/actions/agent-conversations'

const SKILL_MUTATING_TOOLS = [
  'SNEW_CREATE_SKILL',
  'SNEW_DELETE_SKILL',
  'SNEW_UPDATE_SKILL',
  'SNEW_CREATE_WORKFLOW',
  'SNEW_DELETE_WORKFLOW',
  'SNEW_UPDATE_WORKFLOW',
]

interface ServerMessage {
  id: string
  role: string
  content: string
  sender_id: string | null
  sender_name: string | null
  sender_avatar: string | null
}

interface UseAgentChatOptions {
  onSkillMutation?: () => void
  initialConversationId?: string | null
  initialMessages?: ServerMessage[]
  initialQuery?: string
}

export function useAgentChat(
  agentId: string,
  currentUserId: string,
  options?: UseAgentChatOptions
) {
  // Transform server messages to UIMessage format — computed once during init, not in useEffect
  const [serverMessages] = useState<UIMessage[] | undefined>(() => {
    if (!options?.initialMessages?.length) return undefined
    return options.initialMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
        metadata: m.sender_id
          ? {
              senderId: m.sender_id,
              senderName: m.sender_name,
              senderAvatar: m.sender_avatar,
            }
          : undefined,
      }))
  })

  const [conversationId, setConversationId] = useState<string | null>(
    options?.initialConversationId ?? null
  )
  const conversationIdRef = useRef<string | null>(options?.initialConversationId ?? null)
  const onSkillMutationRef = useRef(options?.onSkillMutation)

  // Sync refs after render — refs must not be written during render (React 19)
  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])
  useEffect(() => {
    onSkillMutationRef.current = options?.onSkillMutation
  }, [options?.onSkillMutation])

  // Stable transport — recreated only when agentId changes.
  // body() is called during fetch (not render), so reading the ref there is safe.

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/agents/${agentId}/chat`,
        body: () => ({ conversationId: conversationIdRef.current }),
        fetch: async (url, fetchOptions) => {
          const response = await globalThis.fetch(url as string, fetchOptions as RequestInit)
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

  // Vercel AI SDK v6 — initialMessages from server component (no useEffect needed)
  const {
    messages,
    status,
    error: chatError,
    sendMessage: aiSendMessage,
    setMessages,
    stop,
  } = useChat({ transport, onFinish, messages: serverMessages })

  // Auto-send initial query from ?q= param (fires exactly once on mount)
  const sentInitialRef = useRef(false)
  useEffect(() => {
    if (options?.initialQuery && !sentInitialRef.current) {
      sentInitialRef.current = true
      aiSendMessage({ text: options.initialQuery })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime subscription: new messages from other users
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

  // Realtime subscription: conversation changes (when another user starts a new chat)
  // Note: loadConversationHistory is called inside the event callback (event-driven),
  // not on render — this is a subscription handler, not a data-fetch-on-mount pattern.
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
            // Another user activated a different conversation — reload via server action
            setConversationId(null)
            setMessages([])

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
                      metadata: m.sender_id
                        ? {
                            senderId: m.sender_id,
                            senderName: m.sender_name,
                            senderAvatar: m.sender_avatar,
                          }
                        : undefined,
                    }))
                  setMessages(loaded)
                }
              })
              .catch((err) => console.error('Failed to reload conversation:', err))
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
    error: chatError?.message ?? null,
    conversationId,
    sendMessage,
    startNewChat,
    stop,
    setMessages,
  }
}
