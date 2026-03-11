'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { agents as staticAgents, type Agent } from '@/data/agents'
import CategoryTabs, { type DiscoverFilter } from './category-tabs'
import AgentCard from './agent-card'

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
  agents?: Agent[]
}

export default function DiscoverClient({ agents }: DiscoverClientProps) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DiscoverFilter>('All')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const agentList = agents ?? staticAgents

  // Simulated active agents (first 5 by default)
  const activeIds = useMemo(() => new Set(agentList.slice(0, 5).map((a) => a.id)), [agentList])

  const activeCount = activeIds.size

  const filtered = useMemo(() => {
    let result = agentList

    // Apply category / special filter
    if (filter === 'Active') {
      result = result.filter((a) => activeIds.has(a.id))
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
  }, [filter, search, activeIds, agentList])

  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            {t('discover.title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            <span className="text-foreground font-medium">{activeCount}</span>{' '}
            {t('discover.subtitle')}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('discover.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-full border-none py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
          />
        </div>

        {/* Category Tabs */}
        <CategoryTabs activeFilter={filter} onFilterChange={setFilter} activeCount={activeCount} />

        {/* Agent Grid */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onClick={setSelectedAgent} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">No co-workers found</p>
          </div>
        )}

        <div className="h-10" />
      </div>
    </div>
  )
}
