'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

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

const STATUS_ITEMS = [
  { key: 'all', label: 'All', count: 38 },
  { key: 'active', label: 'Active', count: 8 },
  { key: 'recommended', label: 'Recommended', count: 6 },
] as const

const CATEGORY_ITEMS = [
  { key: 'cart', label: 'Carrinho & Conversão', count: 4 },
  { key: 'retention', label: 'Retenção & Churn', count: 3 },
  { key: 'campaign', label: 'Marketing & Campanhas', count: 7 },
  { key: 'ads', label: 'Ads & Performance', count: 4 },
  { key: 'analytics', label: 'Analytics & Inteligência', count: 6 },
  { key: 'scale', label: 'Atendimento & Experiência', count: 3 },
  { key: 'content', label: 'Produto & Catálogo', count: 3 },
  { key: 'social', label: 'Redes Sociais', count: 4 },
  { key: 'operations', label: 'Visibilidade & IA', count: 6 },
] as const

export default function SkillFilterSidebar() {
  const router = useRouter()
  const params = useSearchParams()
  const status = params.get('status') ?? 'all'
  const category = params.get('category') ?? ''

  const navigate = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) next.set(k, v)
      else next.delete(k)
    })
    router.push(`?${next.toString()}`, { scroll: false })
  }

  return (
    <aside className="border-border hidden h-screen w-52 shrink-0 flex-col overflow-y-auto border-r py-6 md:flex">
      {/* Status filters */}
      <div className="mb-2 flex flex-col gap-0.5 px-2">
        {STATUS_ITEMS.map((item) => (
          <FilterItem
            key={item.key}
            isActive={status === item.key && !category}
            label={item.label}
            count={item.count}
            onClick={() => navigate({ status: item.key, category: '' })}
          />
        ))}
      </div>

      <div className="border-border/50 mx-3 my-2 border-t" />

      {/* Category filters */}
      <div className="flex flex-col gap-0.5 px-2">
        <p
          className="text-muted-foreground mb-1.5 px-1 tracking-widest uppercase"
          style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em' }}
        >
          Category
        </p>
        {CATEGORY_ITEMS.map((cat) => (
          <FilterItem
            key={cat.key}
            isActive={category === cat.key}
            label={cat.label}
            count={cat.count}
            onClick={() => navigate({ category: cat.key, status: '' })}
          />
        ))}
      </div>
    </aside>
  )
}
