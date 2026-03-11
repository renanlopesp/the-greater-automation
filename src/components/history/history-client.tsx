'use client'

import { useState, useMemo, useRef } from 'react'
import { Search, MoreHorizontal, Clock } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { conversations as staticConversations, type Conversation } from '@/data/conversations'

export interface ConversationRow {
  id: string
  title: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  agent_id: string | null
  agents: { name: string; palette: string | null } | null
}

function getDateBucket(dateStr: string | null): 'today' | 'yesterday' | 'older' {
  if (!dateStr) return 'older'
  const now = new Date()
  const date = new Date(dateStr)
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = nowDay.getTime() - dateDay.getTime()
  if (diff === 0) return 'today'
  if (diff === 86400000) return 'yesterday'
  return 'older'
}

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function rowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title ?? 'Sem título',
    lastMessage: row.agents?.name ?? '',
    timestamp: formatTimestamp(row.updated_at),
    date: getDateBucket(row.updated_at),
    messages: [],
  }
}

interface HistoryClientProps {
  conversations?: ConversationRow[]
}

export default function HistoryClient({ conversations: conversationRows }: HistoryClientProps) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const conversations: Conversation[] = useMemo(() => {
    if (conversationRows !== undefined) {
      return conversationRows.map(rowToConversation)
    }
    return staticConversations
  }, [conversationRows])

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
    )
  }, [search, conversations])

  const grouped = useMemo(() => {
    const groups: { label: string; key: string; items: Conversation[] }[] = []
    const dateLabels = {
      today: t('history.today'),
      yesterday: t('history.yesterday'),
      older: 'Anteriores',
    }

    for (const conv of filtered) {
      const label = dateLabels[conv.date]
      const existing = groups.find((g) => g.key === conv.date)
      if (existing) {
        existing.items.push(conv)
      } else {
        groups.push({ label, key: conv.date, items: [conv] })
      }
    }

    return groups
  }, [filtered, t])

  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            {t('history.title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {conversations.length} {t('history.conversations')}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('history.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-full border-none py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
          />
        </div>

        {/* Grouped conversations */}
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.key}>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                {group.label}
              </h3>
              <div className="border-border bg-background divide-border divide-y overflow-hidden rounded-2xl border">
                {group.items.map((conv) => (
                  <div
                    key={conv.id}
                    className="group hover:bg-muted/40 relative flex cursor-pointer items-center justify-between px-5 py-3.5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm">{conv.title}</p>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-2">
                      <span className="text-muted-foreground text-xs">{conv.timestamp}</span>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpen(menuOpen === conv.id ? null : conv.id)
                          }}
                          className="text-muted-foreground hover:text-foreground p-1 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuOpen === conv.id && (
                          <div
                            ref={menuRef}
                            className="border-border bg-background absolute top-8 right-0 z-20 w-36 rounded-xl border py-1 shadow-lg"
                          >
                            <button
                              onClick={() => setMenuOpen(null)}
                              className="text-foreground hover:bg-muted w-full px-4 py-2 text-left text-sm transition-colors"
                            >
                              {t('history.share')}
                            </button>
                            <button
                              onClick={() => setMenuOpen(null)}
                              className="hover:bg-muted w-full px-4 py-2 text-left text-sm text-red-500 transition-colors"
                            >
                              {t('history.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground mt-3 text-sm">
              {search
                ? 'Nenhuma conversa encontrada'
                : 'Nenhuma conversa ainda. Comece a conversar com um co-worker!'}
            </p>
          </div>
        )}

        <div className="h-10" />
      </div>
    </div>
  )
}
