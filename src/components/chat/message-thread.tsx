'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { Message } from '@/data/conversations'

interface MessageThreadProps {
  messages: Message[]
}

export default function MessageThread({ messages }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            'flex max-w-[85%] gap-3',
            msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
          )}
        >
          {msg.role === 'assistant' && (
            <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm">
              {msg.agentEmoji ?? '\uD83E\uDD16'}
            </div>
          )}
          <div
            className={cn(
              'rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user' ? 'bg-foreground text-background' : 'bg-muted text-foreground'
            )}
          >
            {msg.role === 'assistant' && msg.agentName && (
              <p className="text-muted-foreground mb-1 text-[11px] font-medium">{msg.agentName}</p>
            )}
            <div className="whitespace-pre-wrap">{msg.content}</div>
            <p
              className={cn(
                'mt-2 text-[10px]',
                msg.role === 'user' ? 'text-background/60' : 'text-muted-foreground'
              )}
            >
              {msg.timestamp}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
