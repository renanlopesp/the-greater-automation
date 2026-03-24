'use client'

import { cn } from '@/lib/utils'
import { SKILL_CATEGORIES } from '@/data/skills'

interface FilterItemProps {
  isActive: boolean
  label: string
  count: number
  onClick: () => void
}

function FilterItem({ isActive, label, count, onClick }: FilterItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors',
        isActive ? 'bg-muted' : 'hover:bg-muted/60'
      )}
    >
      <span
        className={cn(
          'text-[13px]',
          isActive ? 'text-foreground font-medium' : 'text-muted-foreground font-normal'
        )}
      >
        {label}
      </span>
      <span className="text-muted-foreground text-[11px]">{count}</span>
    </button>
  )
}

interface SkillFilterSidebarProps {
  statusFilter: 'all' | 'active' | 'recommended'
  categoryFilter: string
  activeCount: number
  onStatusChange: (status: 'all' | 'active' | 'recommended') => void
  onCategoryChange: (category: string) => void
}

export default function SkillFilterSidebar({
  statusFilter,
  categoryFilter,
  activeCount,
  onStatusChange,
  onCategoryChange,
}: SkillFilterSidebarProps) {
  const statusItems = [
    { key: 'all' as const, label: 'All', count: 38 },
    { key: 'active' as const, label: 'Active', count: activeCount },
    { key: 'recommended' as const, label: 'Recommended', count: 6 },
  ]

  return (
    <aside className="border-border sticky top-0 hidden h-screen w-52 shrink-0 flex-col overflow-y-auto border-r py-6 md:flex">
      {/* Status filters */}
      <div className="mb-2 flex flex-col gap-0.5 px-2">
        {statusItems.map((item) => (
          <FilterItem
            key={item.key}
            isActive={statusFilter === item.key && !categoryFilter}
            label={item.label}
            count={item.count}
            onClick={() => onStatusChange(item.key)}
          />
        ))}
      </div>

      <div className="border-border/50 mx-3 my-2 border-t" />

      {/* Category filters */}
      <div className="flex flex-col gap-0.5 px-2">
        <p
          className="text-muted-foreground mb-1.5 px-1 uppercase"
          style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em' }}
        >
          Category
        </p>
        {SKILL_CATEGORIES.slice(1).map((cat) => (
          <FilterItem
            key={cat.key}
            isActive={categoryFilter === cat.key}
            label={cat.label}
            count={cat.count}
            onClick={() => onCategoryChange(cat.key)}
          />
        ))}
      </div>
    </aside>
  )
}
