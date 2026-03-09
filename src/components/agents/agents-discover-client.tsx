'use client'

import { useMemo, useState } from 'react'
import { Search, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import AgentDetailModal from '@/components/home/agent-detail-modal'

interface AgentItem {
  id: string
  name: string
  description: string | null
  is_active: boolean
  palette: string
  category?: string | null
}

interface AgentsDiscoverClientProps {
  agents: AgentItem[]
}

function getAgentCategory(agent: AgentItem): string {
  if (agent.category) return agent.category
  const paletteMap: Record<string, string> = {
    blue: 'Customer Service',
    orange: 'Marketing',
    green: 'Analytics',
    purple: 'Competitors',
  }
  return paletteMap[agent.palette] ?? 'Productivity'
}

export default function AgentsDiscoverClient({ agents }: AgentsDiscoverClientProps) {
  const [search, setSearch] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const activeCount = agents.filter((a) => a.is_active).length

  const filtered = useMemo(() => {
    if (!search.trim()) return agents
    const q = search.toLowerCase()
    return agents.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.description?.toLowerCase().includes(q) ?? false)
    )
  }, [agents, search])

  const grouped = useMemo(() => {
    const map = new Map<string, AgentItem[]>()
    for (const agent of filtered) {
      const cat = getAgentCategory(agent)
      const list = map.get(cat)
      if (list) list.push(agent)
      else map.set(cat, [agent])
    }
    return Array.from(map.entries()).map(([name, items]) => ({
      name,
      items,
      activeCount: items.filter((a) => a.is_active).length,
    }))
  }, [filtered])

  return (
    <>
      <div className="mx-auto max-w-3xl px-6 pt-16 pb-8">
        <div className="mb-1">
          <h1 className="text-2xl font-semibold tracking-tight">Add Co-workers</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose specialists to work inside{' '}
            <span className="text-foreground font-semibold">Snew</span>.{' '}
            <span className="text-foreground font-semibold">{activeCount} active</span>.
          </p>
        </div>

        <div className="relative my-6">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search co-workers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted rounded-full pl-9"
          />
        </div>

        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.name}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold">{group.name}</h2>
                <span className="text-muted-foreground text-sm">{group.activeCount} active</span>
              </div>
              <div className="space-y-1">
                {group.items.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      setSelectedAgent(agent)
                      setModalOpen(true)
                    }}
                    className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {agent.description ?? 'No description'}
                      </p>
                    </div>
                    {agent.is_active && (
                      <span className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
                        <Check className="size-3" />
                        Added
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground text-sm">No co-workers found</p>
            </div>
          )}
        </div>
      </div>

      <AgentDetailModal agent={selectedAgent} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
