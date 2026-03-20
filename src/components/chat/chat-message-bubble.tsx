'use client'

import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface ChatMessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  avatarUrl?: string
  avatarFallback?: string
  isStreaming?: boolean
}

function StreamingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]" />
      <span className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]" />
      <span className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full" />
    </div>
  )
}

function SnewAvatar({ url, fallback }: { url?: string; fallback?: string }) {
  return (
    <div className="bg-foreground text-background flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Assistant" className="h-7 w-7 rounded-full object-cover" />
      ) : (
        <span>{fallback ?? 'S'}</span>
      )}
    </div>
  )
}

export default function ChatMessageBubble({
  role,
  content,
  avatarUrl,
  avatarFallback,
  isStreaming,
}: ChatMessageBubbleProps) {
  const isUser = role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="bg-muted text-foreground max-w-[90%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm md:max-w-[75%]">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 px-4 py-1">
      <SnewAvatar url={avatarUrl} fallback={avatarFallback} />
      <div className="text-foreground max-w-[90%] text-sm md:max-w-[80%]">
        {isStreaming && !content ? (
          <StreamingDots />
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 list-disc pl-4 last:mb-0">{children}</ul>,
              ol: ({ children }) => (
                <ol className="mb-2 list-decimal pl-4 last:mb-0">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ children, className }) => {
                const isBlock = className?.includes('language-')
                return isBlock ? (
                  <code
                    className={cn(
                      'bg-muted block overflow-x-auto rounded-md px-3 py-2 font-mono text-xs',
                      className
                    )}
                  >
                    {children}
                  </code>
                ) : (
                  <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">{children}</code>
                )
              },
              pre: ({ children }) => <pre className="mb-2 last:mb-0">{children}</pre>,
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
