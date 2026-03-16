'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { useCoworkerAvatars } from '@/hooks/use-coworker-avatars'
import { agents as catalog, type Agent, type AgentCategory } from '@/data/agents'
import CategoryTabs, { type DiscoverFilter } from './category-tabs'
import AgentCard from './agent-card'
import InstallWizardModal from './install-wizard-modal'

// Recommended agents — hand-picked IDs
const recommendedIds = new Set([
  'customer-service',
  'conversion-optimizer',
  'competitor-watch',
  'revenue-intelligence',
  'store-audit-scanner',
  'task-prioritizer',
])

interface DiscoverClientProps {
  activeIds?: string[]
}

export default function DiscoverClient({ activeIds = [] }: DiscoverClientProps) {
  const { t } = useLanguage()
  const { avatars } = useCoworkerAvatars()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DiscoverFilter>('All')
  const [selectedAgent, setSelectedAgent] = useState<{ id: string; name: string } | null>(null)

  const activeSet = useMemo(() => new Set(activeIds), [activeIds])
  const activeCount = activeSet.size

  // Category counts for tabs
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const agent of catalog) {
      counts[agent.category] = (counts[agent.category] ?? 0) + 1
    }
    return counts
  }, [])

  const filtered = useMemo(() => {
    let result = catalog

    // Apply category / special filter
    if (filter === 'Active') {
      result = result.filter((a) => activeSet.has(a.id))
    } else if (filter === 'Recommended') {
      result = result.filter((a) => recommendedIds.has(a.id))
    } else if (filter !== 'All') {
      result = result.filter((a) => a.category === filter)
    }

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      )
    }

    return result
  }, [filter, search, activeSet])

  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-foreground text-2xl font-medium">Co-Workers</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Instale especialistas para trabalhar dentro do{' '}
            <span className="text-foreground font-medium">Snew</span>.{' '}
            <span className="text-foreground font-medium">{activeCount} ativos</span>.
          </p>

          {/* Search */}
          <div className="bg-muted mt-4 flex items-center gap-2 rounded-2xl px-4 py-2.5">
            <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <input
              type="text"
              placeholder="Buscar agentes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <CategoryTabs
          activeFilter={filter}
          onFilterChange={setFilter}
          totalCount={catalog.length}
          activeCount={activeCount}
          recommendedCount={recommendedIds.size}
          categoryCounts={categoryCounts}
        />

        {/* Agent Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isActive={activeSet.has(agent.id)}
              avatars={avatars}
              onOpenWizard={
                activeSet.has(agent.id) ? undefined : (id, name) => setSelectedAgent({ id, name })
              }
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">No co-workers found</p>
          </div>
        )}

        <div className="h-10" />
      </div>

      {selectedAgent && (
        <InstallWizardModal
          agentId={selectedAgent.id}
          agentName={selectedAgent.name}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  )
}
