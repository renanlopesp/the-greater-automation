'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Bot, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface AgentItem {
  id: string
  name: string
  description: string | null
  is_active: boolean
  palette: string
}

interface AgentsDiscoverClientProps {
  agents: AgentItem[]
}

export default function AgentsDiscoverClient({ agents }: AgentsDiscoverClientProps) {
  const [search, setSearch] = useState('')

  const activeCount = agents.filter((a) => a.is_active).length

  const filtered = useMemo(() => {
    if (!search.trim()) return agents
    const q = search.toLowerCase()
    return agents.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.description?.toLowerCase().includes(q) ?? false)
    )
  }, [agents, search])

  return (
    <div className="mx-auto max-w-3xl px-6 pt-16 pb-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <Badge variant="secondary" className="text-xs">
          {activeCount} active
        </Badge>
      </div>

      <div className="relative mb-8">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-muted rounded-full pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((agent) => (
          <Link
            key={agent.id}
            href={`/agents/${agent.id}`}
            className="hover:bg-accent flex items-center gap-3 rounded-xl border p-4 transition-colors"
          >
            <div className="bg-primary/10 relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <Bot className="text-primary h-5 w-5" />
              {agent.is_active && (
                <span className="border-background absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 bg-green-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{agent.name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {agent.description ?? 'No description'}
              </p>
            </div>
            <Badge variant={agent.is_active ? 'default' : 'outline'} className="text-xs">
              {agent.is_active ? 'Added' : 'Add'}
            </Badge>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bot className="text-muted-foreground size-10" />
            <p className="text-muted-foreground mt-3 text-sm">No agents found</p>
          </div>
        )}
      </div>
    </div>
  )
}
