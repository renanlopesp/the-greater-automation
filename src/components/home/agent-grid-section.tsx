'use client'

import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import AgentDetailModal from '@/components/home/agent-detail-modal'

interface AgentItem {
  id: string
  name: string
  description: string | null
  palette: string
  is_active: boolean
  category?: string | null
}

interface AgentGridSectionProps {
  agents: AgentItem[]
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  'Customer Service': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Marketing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Competitors: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Analytics: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  Audit: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Productivity: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
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

export default function AgentGridSection({ agents }: AgentGridSectionProps) {
  const categorized = useMemo(() => {
    const map = new Map<string, AgentItem[]>()
    for (const agent of agents) {
      const cat = getAgentCategory(agent)
      const list = map.get(cat)
      if (list) list.push(agent)
      else map.set(cat, [agent])
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
  }, [agents])

  const [activeTab, setActiveTab] = useState(categorized[0]?.name ?? '')
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const activeAgents = useMemo(
    () => categorized.find((c) => c.name === activeTab)?.items ?? [],
    [categorized, activeTab]
  )

  if (agents.length === 0) return null

  return (
    <>
      <div className="space-y-4">
        {/* Category tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {categorized.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveTab(cat.name)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                activeTab === cat.name
                  ? 'border-foreground/20 bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              )}
            >
              {cat.name}
              <span className="text-muted-foreground">{cat.items.length}</span>
            </button>
          ))}
        </div>

        {/* Agent cards - 4 column grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {activeAgents.map((agent) => {
            const category = getAgentCategory(agent)
            const badgeColor = CATEGORY_BADGE_COLORS[category] ?? 'bg-muted text-muted-foreground'

            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => {
                  setSelectedAgent(agent)
                  setModalOpen(true)
                }}
                className="group bg-card hover:bg-accent/50 relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-colors"
              >
                {agent.is_active && (
                  <div className="absolute top-3 right-3">
                    <Check className="text-muted-foreground size-4" />
                  </div>
                )}
                <span
                  className={cn(
                    'w-fit rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                    badgeColor
                  )}
                >
                  {category}
                </span>
                <div className="space-y-1">
                  <p className="text-sm leading-tight font-medium">{agent.name}</p>
                  <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                    {agent.description ?? 'No description'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <AgentDetailModal agent={selectedAgent} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
