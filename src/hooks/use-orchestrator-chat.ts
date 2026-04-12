'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface ServerMessage {
  id: string
  role: string
  content: string
}

interface UseOrchestratorChatOptions {
  initialConversationId?: string | null
  initialMessages?: ServerMessage[]
  initialQuery?: string
  taskId?: string
  model?: string
  skillSlug?: string
}

/**
 * Hook for orchestrator chat. Uses `/api/chat` (NOT `/api/agents/[id]/chat`).
 * The orchestrator is not an agent — it has its own conversations table.
 */
export function useOrchestratorChat(options?: UseOrchestratorChatOptions) {
  const router = useRouter()

  // Transform server messages to UIMessage format
  const [serverMessages] = useState<UIMessage[] | undefined>(() => {
    if (!options?.initialMessages?.length) return undefined
    return options.initialMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
      }))
  })

  const [conversationId, setConversationId] = useState<string | null>(
    options?.initialConversationId ?? null
  )
  const conversationIdRef = useRef<string | null>(options?.initialConversationId ?? null)

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  const taskIdRef = useRef<string | undefined>(options?.taskId)
  const modelRef = useRef<string | undefined>(options?.model)
  const skillSlugRef = useRef<string | undefined>(options?.skillSlug)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({
          conversationId: conversationIdRef.current,
          taskId: taskIdRef.current,
          ...(modelRef.current ? { model: modelRef.current } : {}),
          ...(skillSlugRef.current ? { skill_slug: skillSlugRef.current } : {}),
        }),
        fetch: async (url, fetchOptions) => {
          const response = await globalThis.fetch(url as string, fetchOptions as RequestInit)
          const contentType = response.headers.get('Content-Type')
          if (contentType?.includes('application/json')) {
            // Skill path: backend returns { ok: true, taskId, skill } — navigate immediately
            const cloned = response.clone()
            const json = await cloned.json()
            if (json?.ok === true && json?.taskId) {
              router.push(`/chat/task/${json.taskId}`)
            }
            return response
          }
          // SSE path (default): extract conversation id from header
          const newConvId = response.headers.get('X-Conversation-Id')
          if (newConvId) setConversationId(newConvId)
          return response
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const {
    messages,
    status,
    error: chatError,
    sendMessage: aiSendMessage,
    setMessages,
    stop,
  } = useChat({ transport, messages: serverMessages })

  // Auto-send initial query from dashboard (fires once)
  const sentInitialRef = useRef(false)
  useEffect(() => {
    if (options?.initialQuery && !sentInitialRef.current) {
      sentInitialRef.current = true
      aiSendMessage({ text: options.initialQuery })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const startNewChat = useCallback(() => {
    setConversationId(null)
    conversationIdRef.current = null
    setMessages([])
  }, [setMessages])

  const setModel = useCallback((model: string | undefined) => {
    modelRef.current = model
  }, [])

  const setSkillSlug = useCallback((slug: string | undefined) => {
    skillSlugRef.current = slug
  }, [])

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
    model: modelRef.current,
    setModel,
    setSkillSlug,
  }
}
