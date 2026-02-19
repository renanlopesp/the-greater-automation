'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Send, Loader2, Bot, User } from 'lucide-react'

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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function SnewclawChatPage() {
  const [instance, setInstance] = useState<InstanceStatus | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch instance status (the route determines instance from user session)
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

        // Load chat history
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

  async function handleSend() {
    if (!input.trim() || !instance || isSending) return

    const content = input.trim()
    setInput('')
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
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
        return
      }

      const data = (await res.json()) as {
        sessionId: string
        userMessage: ChatMessage
        assistantMessage: ChatMessage
      }
      // Persist session ID for conversation continuity
      if (data.sessionId) {
        setSessionId(data.sessionId)
      }
      // Replace optimistic with real user msg + add assistant msg
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
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

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
              from the Parent Agent page before chatting.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center gap-3 border-b px-6 py-4">
        <div className="bg-primary/10 flex size-8 items-center justify-center rounded-full">
          <Bot className="text-primary size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Parent Agent</p>
          <p className="text-muted-foreground text-xs">Running</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Send a message to start the conversation
            </p>
          </div>
        )}

        {messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((msg) => (
            <div
              key={msg.id}
              className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              <div
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full',
                  msg.role === 'user' ? 'bg-primary' : 'bg-muted'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="text-primary-foreground size-4" />
                ) : (
                  <Bot className="text-muted-foreground size-4" />
                )}
              </div>

              <div
                className={cn(
                  'flex max-w-[75%] flex-col gap-1',
                  msg.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="px-1.5 py-0 text-xs">
                    {msg.role}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {formatTime(msg.created_at)}
                  </span>
                </div>

                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {msg.content}
                </div>

                {msg.role === 'assistant' && msg.metadata && (
                  <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                    {msg.metadata.model && <span>{String(msg.metadata.model)}</span>}
                    {msg.metadata.tokens != null && (
                      <span>{String(msg.metadata.tokens)} tokens</span>
                    )}
                    {msg.metadata.durationMs != null && (
                      <span>{(Number(msg.metadata.durationMs) / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

        {isSending && (
          <div className="flex gap-3">
            <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
              <Bot className="text-muted-foreground size-4" />
            </div>
            <div className="bg-muted flex items-center gap-1 rounded-2xl px-4 py-2.5">
              <span className="bg-muted-foreground size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
              <span className="bg-muted-foreground size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
              <span className="bg-muted-foreground size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-border border-t px-6 py-4">
        {sendError && <p className="text-destructive mb-2 text-xs">{sendError}</p>}
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your agent…"
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isSending}
            size="icon"
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
