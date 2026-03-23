// DEPRECATED: This component belongs to the old multi-agent discover page.
// It will be replaced by new skill-based category UI components.
// Do not extend — use src/components/skills/ for new skill UI.
'use client'

import { useRef, useState, useEffect } from 'react'
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentCategory } from '@/data/agents'

export type DiscoverFilter = AgentCategory | 'All' | 'Active' | 'Recommended'

interface CategoryTabsProps {
  activeFilter: DiscoverFilter
  onFilterChange: (filter: DiscoverFilter) => void
  totalCount: number
  activeCount: number
  recommendedCount: number
  categoryCounts: Record<string, number>
}

const specialTabs: { key: DiscoverFilter; label: string }[] = [
  { key: 'All', label: 'Todos' },
  { key: 'Active', label: 'Ativos' },
  { key: 'Recommended', label: 'Recomendados' },
]

const categories: { key: AgentCategory; label: string }[] = [
  { key: 'Customer Service', label: 'Customer Service' },
  { key: 'Marketing', label: 'Marketing' },
  { key: 'Competitors', label: 'Competitors' },
  { key: 'Analytics', label: 'Analytics' },
  { key: 'Audit', label: 'Audit' },
  { key: 'Productivity', label: 'Productivity' },
]

function getSpecialCount(
  key: DiscoverFilter,
  totalCount: number,
  activeCount: number,
  recommendedCount: number
) {
  if (key === 'All') return totalCount
  if (key === 'Active') return activeCount
  if (key === 'Recommended') return recommendedCount
  return 0
}

export default function CategoryTabs({
  activeFilter,
  onFilterChange,
  totalCount,
  activeCount,
  recommendedCount,
  categoryCounts,
}: CategoryTabsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isCategoryActive = categories.some((c) => c.key === activeFilter)

  // Close dropdown on outside click
  useEffect(() => {
    if (!pickerOpen) return
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      )
        return
      setPickerOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  return (
    <div className="flex items-center gap-1">
      {/* Special tabs */}
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
            {getSpecialCount(tab.key, totalCount, activeCount, recommendedCount)}
          </span>
        </button>
      ))}

      {/* Divider */}
      <span className="bg-border mx-2 h-4 w-px shrink-0" />

      {/* Category dropdown */}
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => setPickerOpen((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
            isCategoryActive
              ? 'border-border bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          )}
        >
          <SlidersHorizontal className="h-3 w-3" />
          {isCategoryActive ? activeFilter : 'Categoria'}
          {isCategoryActive ? (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                onFilterChange('All')
                setPickerOpen(false)
              }}
              className="text-muted-foreground/60 hover:text-foreground ml-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronDown className="h-3 w-3 opacity-50" />
          )}
        </button>

        {/* Dropdown */}
        {pickerOpen && (
          <div
            ref={dropdownRef}
            className="border-border bg-background absolute left-0 z-50 mt-1 w-48 rounded-lg border py-1 shadow-lg"
          >
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  onFilterChange(cat.key)
                  setPickerOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-xs transition-colors',
                  activeFilter === cat.key
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {cat.label}
                <span className="text-muted-foreground/50 text-[10px]">
                  {categoryCounts[cat.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
