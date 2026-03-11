'use client'

import { useRef } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { cn } from '@/lib/utils'
import type { AgentCategory } from '@/data/agents'

const categoryEmojis: Record<AgentCategory, string> = {
  All: '',
  'Customer Service': '\uD83C\uDFE7',
  Marketing: '\uD83D\uDCE3',
  Competitors: '\uD83D\uDD0D',
  Analytics: '\uD83D\uDCCA',
  Audit: '\uD83D\uDEE1\uFE0F',
  Productivity: '\u26A1',
}

export type DiscoverFilter = AgentCategory | 'Active' | 'Recommended'

interface CategoryTabsProps {
  activeFilter: DiscoverFilter
  onFilterChange: (filter: DiscoverFilter) => void
  activeCount: number
}

export default function CategoryTabs({
  activeFilter,
  onFilterChange,
  activeCount,
}: CategoryTabsProps) {
  const { t } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)

  const specialTabs: { key: DiscoverFilter; label: string }[] = [
    { key: 'All', label: t('discover.tabs.all') },
    {
      key: 'Active',
      label: `${t('discover.tabs.active')} (${activeCount})`,
    },
    { key: 'Recommended', label: t('discover.tabs.recommended') },
  ]

  const categoryTabs: { key: AgentCategory; label: string; emoji: string }[] = [
    {
      key: 'Customer Service',
      label: 'Customer Service',
      emoji: categoryEmojis['Customer Service'],
    },
    { key: 'Marketing', label: 'Marketing', emoji: categoryEmojis.Marketing },
    { key: 'Competitors', label: 'Competitors', emoji: categoryEmojis.Competitors },
    { key: 'Analytics', label: 'Analytics', emoji: categoryEmojis.Analytics },
    { key: 'Audit', label: 'Audit', emoji: categoryEmojis.Audit },
    { key: 'Productivity', label: 'Productivity', emoji: categoryEmojis.Productivity },
  ]

  return (
    <div ref={scrollRef} className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1">
      {specialTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onFilterChange(tab.key)}
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            activeFilter === tab.key
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}

      <div className="bg-border mx-1 h-5 w-px shrink-0" />

      {categoryTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onFilterChange(tab.key)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            activeFilter === tab.key
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="text-xs">{tab.emoji}</span>
          {tab.label}
        </button>
      ))}
    </div>
  )
}
