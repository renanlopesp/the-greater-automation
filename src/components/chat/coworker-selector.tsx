'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { coworkerCatalog } from '@/data/coworkers'
import { cn } from '@/lib/utils'

const VISIBLE_COUNT = 3

export interface CoworkerItem {
  id: string
  name: string
  emoji: string
}

interface CoworkerSelectorProps {
  onSelect?: (coworkerId: string | null) => void
  coworkers?: CoworkerItem[]
}

export default function CoworkerSelector({ onSelect, coworkers }: CoworkerSelectorProps) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState<string | null>(null)

  const catalog = coworkers ?? coworkerCatalog
  const visible = catalog.slice(0, VISIBLE_COUNT)
  const overflow = catalog.length - VISIBLE_COUNT

  const handleSelect = (id: string | null) => {
    const next = selected === id ? null : id
    setSelected(next)
    onSelect?.(next)
  }

  return (
    <div className="scrollbar-none flex items-center gap-2 overflow-x-auto">
      <button
        onClick={() => handleSelect(null)}
        className={cn(
          'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
          selected === null
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:text-foreground'
        )}
      >
        {t('chat.coworkerAll')}
      </button>

      {visible.map((cw) => (
        <button
          key={cw.id}
          onClick={() => handleSelect(cw.id)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
            selected === cw.id
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          <span>{cw.emoji}</span>
          {cw.name}
        </button>
      ))}

      {overflow > 0 && (
        <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-3 py-1.5 text-xs">
          +{overflow}
        </span>
      )}
    </div>
  )
}
