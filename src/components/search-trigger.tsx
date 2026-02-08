'use client'

import { Search } from 'lucide-react'

interface SearchTriggerProps {
  onOpen: () => void
}

export default function SearchTrigger({ onOpen }: SearchTriggerProps) {
  return (
    <button
      onClick={onOpen}
      className="text-muted-foreground bg-muted/50 border-border hover:bg-muted flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border px-3 text-sm transition-colors"
    >
      <Search className="h-4 w-4" />
      <span>Type Ctrl K to search</span>
    </button>
  )
}
