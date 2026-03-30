'use client'

import { cn } from '@/lib/utils'

interface ChatContinueWithProps {
  items: string[]
  onSelect: (text: string) => void
  className?: string
}

export default function ChatContinueWith({ items, onSelect, className }: ChatContinueWithProps) {
  if (items.length === 0) return null

  return (
    <div className={cn('flex flex-col', className)}>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 500,
          color: 'var(--muted-foreground)',
          letterSpacing: '0.02em',
          marginBottom: '8px',
        }}
      >
        Continue with
      </span>

      {items.map((item, i) => (
        <div
          key={i}
          onClick={() => onSelect(item)}
          className="group flex cursor-pointer items-center gap-2"
          style={{
            padding: '10px 0',
            borderBottom: i < items.length - 1 ? '1px solid var(--border)' : undefined,
          }}
        >
          <span
            style={{
              color: 'var(--muted-foreground)',
              flexShrink: 0,
            }}
          >
            ↳
          </span>
          <span
            className="transition-colors"
            style={{
              fontSize: '13px',
              color: 'var(--muted-foreground)',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--foreground)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'
            }}
          >
            {item}
          </span>
        </div>
      ))}
    </div>
  )
}
