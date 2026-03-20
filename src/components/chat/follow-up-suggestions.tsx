'use client'

import { cn } from '@/lib/utils'
import { CornerDownRight } from 'lucide-react'

interface FollowUpSuggestionsProps {
  suggestions: string[]
  onSelect: (text: string) => void
  className?: string
}

export default function FollowUpSuggestions({
  suggestions,
  onSelect,
  className,
}: FollowUpSuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className={cn('flex flex-col', className)}>
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="text-muted-foreground hover:text-foreground hover:bg-accent w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"
        >
          <span className="flex items-start gap-2">
            <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{suggestion}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
