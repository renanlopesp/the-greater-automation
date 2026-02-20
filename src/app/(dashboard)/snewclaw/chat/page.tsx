'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Bot, CopyIcon, Loader2, Plus } from 'lucide-react'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'

type MessageMetadata = {
  model?: string
  tokens?: number
  durationMs?: number
  [key: string]: unknown
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  metadata: MessageMetadata | null
  created_at: string
}

type InstanceStatus = {
  id: string
  status: string
}

export default function SnewclawChatPage() {
  const [instance, setInstance] = useState<InstanceStatus | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const statusRes = await fetch('/api/snewclaw/status')
        if (!statusRes.ok) {
          setError('Could not load agent status')
          setIsLoading(false)
          return
        }
        const statusData = (await statusRes.json()) as InstanceStatus
        setInstance(statusData)

        if (statusData.status !== 'running') {
          setIsLoading(false)
          return
        }

        const historyRes = await fetch(`/api/snewclaw/${statusData.id}/chat`)
        if (historyRes.ok) {
          const historyData = (await historyRes.json()) as { messages: ChatMessage[] }
          setMessages(historyData.messages ?? [])
        }
      } catch {
        setError('Failed to load chat')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim() || !instance || isSending) return

      setIsSending(true)
      setSendError(null)

      const optimisticMsg: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        role: 'user',
        content,
        metadata: null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimisticMsg])

      try {
        const res = await fetch(`/api/snewclaw/${instance.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, ...(sessionId ? { sessionId } : {}) }),
        })

        if (!res.ok) {
          const data = (await res.json().catch(() => ({ error: 'Send failed' }))) as {
            error?: string
          }
          setSendError(data.error ?? 'Send failed')
          setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
          return
        }

        const data = (await res.json()) as {
          sessionId: string
          userMessage: ChatMessage
          assistantMessage: ChatMessage
        }
        if (data.sessionId) {
          setSessionId(data.sessionId)
        }
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticMsg.id),
          data.userMessage,
          data.assistantMessage,
        ])
      } catch (err) {
        setSendError(err instanceof Error ? err.message : 'Send failed')
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      } finally {
        setIsSending(false)
      }
    },
    [instance, isSending, sessionId]
  )

  const handleSubmit = useCallback(
    (msg: PromptInputMessage) => {
      if (msg.text.trim()) {
        void handleSend(msg.text.trim())
      }
    },
    [handleSend]
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    )
  }

  if (!instance || instance.status !== 'running') {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-3 pt-6 pb-6 text-center">
            <Bot className="text-muted-foreground size-10" />
            <p className="font-medium">Agent not running</p>
            <p className="text-muted-foreground text-sm">
              Your agent is currently{' '}
              <span className="font-medium">{instance?.status ?? 'unavailable'}</span>. Start it
              from the Snew Agent page before chatting.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant').length > 0

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex size-8 items-center justify-center rounded-full">
            <Bot className="text-primary size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Snew Agent</p>
            <p className="text-muted-foreground text-xs">Running</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSessionId(null)
            setMessages([])
            setSendError(null)
          }}
        >
          <Plus className="mr-1.5 size-3.5" />
          New Chat
        </Button>
      </div>

      {/* Messages */}
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-3xl">
          {!hasMessages ? (
            <ConversationEmptyState
              icon={<Bot className="size-10" />}
              title="Chat with your Snew Agent"
              description="Send a message to start the conversation"
            />
          ) : (
            messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((msg) => (
                <Message key={msg.id} from={msg.role === 'user' ? 'user' : 'assistant'}>
                  {msg.role === 'assistant' && (
                    <div className="mb-1 flex items-center gap-2">
                      <div className="bg-primary/10 flex size-7 items-center justify-center rounded-full">
                        <Bot className="text-primary size-3.5" />
                      </div>
                      <span className="text-muted-foreground text-sm font-medium">Snew Agent</span>
                    </div>
                  )}

                  <MessageContent>
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <MessageResponse>{msg.content}</MessageResponse>
                    )}
                  </MessageContent>

                  {/* Metadata for assistant messages */}
                  {msg.role === 'assistant' && msg.metadata && (
                    <div className="text-muted-foreground flex flex-wrap gap-2 px-1 text-xs">
                      {msg.metadata.model && <span>{String(msg.metadata.model)}</span>}
                      {msg.metadata.tokens != null && (
                        <span>{String(msg.metadata.tokens)} tokens</span>
                      )}
                      {msg.metadata.durationMs != null && (
                        <span>{(Number(msg.metadata.durationMs) / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  )}

                  {/* Copy action for assistant messages */}
                  {msg.role === 'assistant' && msg.content && (
                    <MessageActions>
                      <MessageAction
                        tooltip="Copy"
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                      >
                        <CopyIcon className="size-3.5" />
                      </MessageAction>
                    </MessageActions>
                  )}
                </Message>
              ))
          )}

          {/* Typing indicator */}
          {isSending && (
            <Message from="assistant">
              <div className="mb-1 flex items-center gap-2">
                <div className="bg-primary/10 flex size-7 items-center justify-center rounded-full">
                  <Bot className="text-primary size-3.5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Snew Agent</span>
              </div>
              <MessageContent>
                <div className="flex items-center gap-1.5">
                  <span className="bg-muted-foreground size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
                  <span className="bg-muted-foreground size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
                  <span className="bg-muted-foreground size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
                </div>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="bg-background border-t px-4 py-3">
        <div className="mx-auto max-w-3xl">
          {sendError && (
            <div className="border-destructive/20 bg-destructive/10 text-destructive mb-2 rounded-lg border px-3 py-2 text-sm">
              {sendError}
            </div>
          )}
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea placeholder="Message your agent..." disabled={isSending} />
            <PromptInputFooter>
              <div />
              <PromptInputSubmit disabled={isSending} status={isSending ? 'submitted' : 'ready'} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  )
}
