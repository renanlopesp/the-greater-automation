'use client'

import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  className?: string
}

export default function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-end', className)} style={{ gap: '4px', padding: '8px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: '6px',
            height: '6px',
            background: 'var(--muted-foreground)',
            display: 'inline-block',
            animation: 'typing-dot 1s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  )
}
