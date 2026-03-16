'use client'

import { useRef } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { cn } from '@/lib/utils'
import type { AgentCategory } from '@/data/agents'

export type DiscoverFilter = AgentCategory | 'Active' | 'Recommended'

interface CategoryTabsProps {
  activeFilter: DiscoverFilter
  onFilterChange: (filter: DiscoverFilter) => void
  totalCount: number
  activeCount: number
  recommendedCount: number
  categoryCounts: Record<string, number>
}

export default function CategoryTabs({
  activeFilter,
  onFilterChange,
  totalCount,
  activeCount,
  recommendedCount,
  categoryCounts,
}: CategoryTabsProps) {
  const { t } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)

  const specialTabs: { key: DiscoverFilter; label: string; count: number }[] = [
    { key: 'All', label: t('discover.tabs.all'), count: totalCount },
    { key: 'Active', label: t('discover.tabs.active'), count: activeCount },
    { key: 'Recommended', label: t('discover.tabs.recommended'), count: recommendedCount },
  ]

  const categories: { key: AgentCategory; label: string }[] = [
    { key: 'Customer Service', label: 'Customer Service' },
    { key: 'Marketing', label: 'Marketing' },
    { key: 'Competitors', label: 'Competitors' },
    { key: 'Analytics', label: 'Analytics' },
    { key: 'Audit', label: 'Audit' },
    { key: 'Productivity', label: 'Productivity' },
  ]

  return (
    <div ref={scrollRef} className="scrollbar-none flex items-center gap-1 overflow-x-auto pb-2">
      {specialTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onFilterChange(tab.key)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            activeFilter === tab.key
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
          <span
            className={cn(
              'text-[10px]',
              activeFilter === tab.key ? 'text-foreground/50' : 'text-muted-foreground/50'
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}

      <span className="bg-border mx-1 h-4 w-px shrink-0" />

      {categories.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onFilterChange(cat.key)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            activeFilter === cat.key
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {cat.label}
          <span
            className={cn(
              'text-[10px]',
              activeFilter === cat.key ? 'text-foreground/50' : 'text-muted-foreground/50'
            )}
          >
            {categoryCounts[cat.key] ?? 0}
          </span>
        </button>
      ))}
    </div>
  )
}
