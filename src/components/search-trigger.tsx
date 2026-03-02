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
      className="text-muted-foreground bg-background border-border/60 hover:bg-background focus-visible:ring-ring flex h-12 w-full items-center gap-2 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <Search className="h-4 w-4" />
      <span className="text-left">Digite</span>
      <kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium">
        {modKey} K
      </kbd>
      <span className="text-left">para buscar</span>
    </button>
  )
}
