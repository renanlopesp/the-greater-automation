'use client'

import { useSyncExternalStore } from 'react'
import { Search } from 'lucide-react'

interface SearchTriggerProps {
  onOpen: () => void
}

const emptySubscribe = () => () => {}

function getModKey() {
  if (typeof navigator === 'undefined') return 'Ctrl'
  if (navigator.platform?.toUpperCase().includes('MAC') || navigator.userAgent?.includes('Mac')) {
    return '⌘'
  }
  return 'Ctrl'
}

export default function SearchTrigger({ onOpen }: SearchTriggerProps) {
  const modKey = useSyncExternalStore(emptySubscribe, getModKey, () => 'Ctrl')

  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-muted-foreground bg-muted/50 border-border hover:bg-muted focus-visible:ring-ring flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium">
        {modKey} K
      </kbd>
    </button>
  )
}
