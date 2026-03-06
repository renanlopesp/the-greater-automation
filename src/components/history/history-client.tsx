'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Conversation {
  id: string
  agentId: string
  title: string
  createdAt: string
}

interface HistoryClientProps {
  conversations: Conversation[]
}

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function HistoryClient({ conversations }: HistoryClientProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter((c) => c.title.toLowerCase().includes(q))
  }, [conversations, search])

  const grouped = useMemo(() => {
    const groups: { label: string; items: Conversation[] }[] = []
    const groupMap = new Map<string, Conversation[]>()

    for (const conv of filtered) {
      const label = formatDateGroup(conv.createdAt)
      const existing = groupMap.get(label)
      if (existing) {
        existing.push(conv)
      } else {
        const items = [conv]
        groupMap.set(label, items)
        groups.push({ label, items })
      }
    }

    return groups
  }, [filtered])

  return (
    <div className="mx-auto max-w-3xl px-6 pt-16 pb-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <Badge variant="secondary" className="text-xs">
          {conversations.length} conversations
        </Badge>
      </div>

      <div className="relative mb-8">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-muted rounded-full pl-9"
        />
      </div>

      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.label}>
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/agents/${conv.agentId}?conversation=${conv.id}`}
                  className="hover:bg-accent flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
                >
                  <span className="truncate text-sm">{conv.title}</span>
                  <span className="text-muted-foreground ml-4 shrink-0 text-xs">
                    {formatTime(conv.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clock className="text-muted-foreground size-10" />
          <p className="text-muted-foreground mt-3 text-sm">
            {search ? 'No conversations found' : 'No conversations yet'}
          </p>
        </div>
      )}
    </div>
  )
}
