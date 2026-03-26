'use client'

import React, { useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  snippetCard?: React.ReactNode
  followUps?: React.ReactNode
}

interface SkillChatPanelProps {
  messages: ChatMessage[]
  quickActions?: Array<{ label: string; message: string }>
  inputPlaceholder?: string
  onSendMessage?: (message: string) => void
  heroCard?: React.ReactNode
}

export function SkillChatPanel({
  messages,
  quickActions,
  inputPlaceholder = 'Envie uma mensagem...',
  onSendMessage,
  heroCard,
}: SkillChatPanelProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    onSendMessage?.(trimmed)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-6">
            {heroCard && <div className="w-full max-w-sm">{heroCard}</div>}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}
              >
                {msg.role === 'user' ? (
                  <div className="bg-muted max-w-[80%] rounded-2xl px-4 py-2.5 text-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="flex max-w-[90%] gap-2">
                    <div className="mt-0.5 shrink-0 text-base">🤖</div>
                    <div className="flex flex-col gap-2">
                      <div className="rounded-2xl px-4 py-2.5 text-sm">{msg.content}</div>
                      {msg.followUps && <div>{msg.followUps}</div>}
                      {msg.snippetCard && <div>{msg.snippetCard}</div>}
                    </div>
                  </div>
                )}
                {msg.timestamp && (
                  <p className="text-muted-foreground mt-1 text-[12px]">{msg.timestamp}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions (shown when empty) */}
      {isEmpty && quickActions && quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => onSendMessage?.(action.message)}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground rounded-full border px-3 py-1.5 text-sm transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-border border-t px-4 py-3">
        <div className="border-border bg-muted/50 flex items-end gap-2 rounded-xl border px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            rows={1}
            className="placeholder:text-muted-foreground flex-1 resize-none bg-transparent text-sm outline-none"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
              input.trim()
                ? 'bg-foreground text-background hover:opacity-80'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
