'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MoreHorizontal } from 'lucide-react'
import { FEATURE_FLAGS } from '@/lib/feature-flags'

export interface ConversationRow {
  id: string
  title: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  agent_id: string | null
  agents: { name: string; palette: string | null } | null
}

const mockChats = [
  { id: '1', title: 'Win-back campaign strategy', date: 'today', group: 'Today' },
  { id: '2', title: 'Competitor pricing analysis', date: 'today', group: 'Today' },
  { id: '3', title: 'Checkout drop-off review', date: 'yesterday', group: 'Yesterday' },
  { id: '4', title: 'Weekend revenue insights', date: 'yesterday', group: 'Yesterday' },
  { id: '5', title: 'Ad waste breakdown', date: 'Mar 28', group: 'Mar 28' },
]

function getDateBucket(dateStr: string | null): string {
  if (!dateStr) return 'Older'
  const now = new Date()
  const date = new Date(dateStr)
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = nowDay.getTime() - dateDay.getTime()
  if (diff === 0) return 'Today'
  if (diff === 86400000) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface HistoryClientProps {
  conversations?: ConversationRow[]
}

export default function HistoryClient({ conversations: conversationRows }: HistoryClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const chats = useMemo(() => {
    if (conversationRows && conversationRows.length > 0) {
      return conversationRows.map((row) => ({
        id: row.id,
        title: row.title ?? 'Untitled',
        group: getDateBucket(row.updated_at),
      }))
    }
    return FEATURE_FLAGS.MOCK_HISTORY ? mockChats : []
  }, [conversationRows])

  const filtered = useMemo(() => {
    if (!search.trim()) return chats
    const q = search.toLowerCase()
    return chats.filter((c) => c.title.toLowerCase().includes(q))
  }, [search, chats])

  const grouped = useMemo(() => {
    const groupMap = new Map<string, typeof chats>()
    for (const chat of filtered) {
      const existing = groupMap.get(chat.group)
      if (existing) {
        existing.push(chat)
      } else {
        groupMap.set(chat.group, [chat])
      }
    }
    return Array.from(groupMap.entries()).map(([label, items]) => ({ label, items }))
  }, [filtered])

  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-6">
        {process.env.NODE_ENV === 'development' && FEATURE_FLAGS.MOCK_HISTORY && (
          <span className="absolute top-2 right-2 z-10 rounded bg-amber-100 px-1 text-[9px] font-medium text-amber-700">
            MOCK
          </span>
        )}
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-foreground text-2xl font-medium">History</h1>
          <p className="text-muted-foreground mt-1 text-sm">{chats.length} conversations</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="text-muted-foreground absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted text-foreground placeholder:text-muted-foreground w-full rounded-2xl border-none px-4 py-3 pl-10 text-sm focus:outline-none"
          />
        </div>

        {/* Grouped conversations */}
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                {group.label}
              </h3>
              <div>
                {group.items.map((chat, idx) => (
                  <div key={chat.id}>
                    <div
                      className="group relative flex cursor-pointer items-center justify-between py-3"
                      onClick={() => router.push(`/chat?c=${chat.id}`)}
                    >
                      <p className="text-foreground text-sm">{chat.title}</p>
                      <div className="ml-4 flex shrink-0 items-center gap-2">
                        <span className="text-muted-foreground text-xs">{chat.group}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpen(menuOpen === chat.id ? null : chat.id)
                          }}
                          className="text-muted-foreground hover:text-foreground p-1 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuOpen === chat.id && (
                          <div className="border-border bg-background absolute top-10 right-0 z-20 w-36 rounded-xl border py-1 shadow-lg">
                            <button
                              onClick={() => setMenuOpen(null)}
                              className="text-foreground hover:bg-muted w-full px-4 py-2 text-left text-sm transition-colors"
                            >
                              Share
                            </button>
                            <button
                              onClick={() => setMenuOpen(null)}
                              className="hover:bg-muted w-full px-4 py-2 text-left text-sm text-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {idx < group.items.length - 1 && <div className="bg-border h-px" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">No conversations found</p>
          </div>
        )}
      </div>
    </div>
  )
}
