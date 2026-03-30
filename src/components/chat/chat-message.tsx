'use client'

import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface ChatMessageProps {
  role: 'assistant' | 'user'
  content: string
  className?: string
}

export default function ChatMessage({ role, content, className }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div
        className={cn('flex flex-col', className)}
        style={{ alignSelf: 'flex-end', maxWidth: '60%' }}
      >
        <div
          className="text-foreground text-sm"
          style={{
            background: 'var(--muted)',
            borderRadius: '20px',
            padding: '9px 18px',
            fontSize: '14px',
          }}
        >
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header row: icon + label */}
      <div className="mb-1 flex flex-row items-center gap-2">
        <div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'var(--foreground)',
            color: 'var(--background)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Bot size={13} />
        </div>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--foreground)',
          }}
        >
          Snew
        </span>
      </div>

      {/* Message text */}
      <div
        className="text-foreground"
        style={{
          fontSize: '14px',
          lineHeight: 1.65,
          marginBottom: '24px',
        }}
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-2 list-disc pl-4 last:mb-0">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 last:mb-0">{children}</ol>,
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            code: ({ children, className: codeClassName }) => {
              const isBlock = codeClassName?.includes('language-')
              return isBlock ? (
                <code
                  className={cn(
                    'bg-muted block overflow-x-auto rounded-md px-3 py-2 font-mono text-xs',
                    codeClassName
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
      </div>
    </div>
  )
}
