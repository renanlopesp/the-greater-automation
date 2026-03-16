'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'What drove the most revenue this week?',
  'Which products have the highest return rate?',
  'Are there customers at risk of churning?',
  'What are competitors doing that I should react to?',
  'How can I improve my checkout conversion?',
  "Give me a summary of yesterday's store performance",
]

interface ChatInputSectionProps {
  orchestratorId: string | null
}

export default function ChatInputSection({ orchestratorId }: ChatInputSectionProps) {
  const [message, setMessage] = useState('')
  const [showAll, setShowAll] = useState(false)
  const router = useRouter()

  function handleSend(text?: string) {
    const msg = text ?? message
    if (!msg.trim() || !orchestratorId) return
    const encoded = encodeURIComponent(msg.trim())
    router.push(`/agents/${orchestratorId}?message=${encoded}`)
  }

  const visibleSuggestions = showAll ? SUGGESTIONS : SUGGESTIONS.slice(0, 6)

  return (
    <div className="space-y-4">
      <div className="bg-card relative rounded-2xl border shadow-sm">
        <textarea
          placeholder="Ask Snew anything..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          rows={4}
          className="placeholder:text-muted-foreground w-full resize-none bg-transparent px-5 pt-4 pb-12 text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!message.trim() || !orchestratorId}
          className={cn(
            'absolute right-4 bottom-4 flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
            message.trim()
              ? 'bg-foreground text-background hover:bg-foreground/90'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <ArrowUp className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {visibleSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => handleSend(suggestion)}
            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-full border px-3.5 py-1.5 text-xs transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
      {!showAll && SUGGESTIONS.length > 6 && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Show more &darr;
          </button>
        </div>
      )}
    </div>
  )
}
