'use client'

import { BubbleAvatar } from '@/config/design-system'

const SUGGESTION_CHIPS = [
  'What drove the most revenue for Minha Loja this week?',
  'Which products have the highest return rate?',
  'Are there customers at risk of churning?',
  'What are competitors doing that I should react to?',
] as const

interface ChatEmptyStateNewProps {
  onSendMessage: (text: string) => void
}

export default function ChatEmptyStateNew({ onSendMessage }: ChatEmptyStateNewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div style={{ animation: 'avatar-pulse-scale 2s ease-in-out infinite' }}>
        <BubbleAvatar skillName="Snew" size={44} animated={false} />
      </div>

      <h2 className="text-foreground mt-5 text-center" style={{ fontSize: 24, fontWeight: 600 }}>
        What can I help you with?
      </h2>

      <p className="text-muted-foreground mt-2 max-w-sm text-center" style={{ fontSize: 14 }}>
        Ask anything about your store — Snew routes your question to the right co-workers.
      </p>

      <div className="mt-6 flex max-w-lg flex-wrap items-center justify-center gap-2">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onSendMessage(chip)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            style={{
              borderRadius: 20,
              border: '0.5px solid var(--border)',
              fontSize: 11,
              padding: '6px 14px',
            }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
