'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowUp } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/language-context'
import { agents } from '@/data/agents'
import { cn } from '@/lib/utils'

const categoryEmojis: Record<string, string> = {
  'Customer Service': '\uD83C\uDFE7',
  Marketing: '\uD83D\uDCE3',
  Competitors: '\uD83D\uDD0D',
  Analytics: '\uD83D\uDCCA',
  Audit: '\uD83D\uDEE1\uFE0F',
  Productivity: '\u26A1',
}

interface TimelineItem {
  id: string
  title: string
  description: string
  timestamp: string
  status: 'done' | 'running' | 'pending'
}

const mockTimeline: TimelineItem[] = [
  {
    id: 't1',
    title: 'Analyzed 284 inactive customers',
    description: 'Segmented by ticket value and last purchase date',
    timestamp: '14:30',
    status: 'done',
  },
  {
    id: 't2',
    title: 'Generated win-back campaign',
    description: '142 VIP customers targeted via WhatsApp',
    timestamp: '14:25',
    status: 'done',
  },
  {
    id: 't3',
    title: 'Monitoring delivery delays',
    description: 'Tracking 12 orders in São Paulo region',
    timestamp: 'Now',
    status: 'running',
  },
  {
    id: 't4',
    title: 'Review collection queued',
    description: '89 post-delivery customers awaiting review request',
    timestamp: 'Scheduled',
    status: 'pending',
  },
]

const mockResults = [
  { label: 'Customers recovered', value: '38' },
  { label: 'Revenue saved', value: 'R$4,800' },
  { label: 'Avg response time', value: '12 min' },
  { label: 'Satisfaction rate', value: '94%' },
]

const statusDot: Record<string, string> = {
  done: 'bg-muted-foreground/40',
  running: 'bg-green-500',
  pending: 'bg-muted-foreground/20 border border-border',
}

interface InstalledClientProps {
  agentId: string
}

export default function InstalledClient({ agentId }: InstalledClientProps) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'log' | 'results'>('log')
  const [message, setMessage] = useState('')

  const agent = agents.find((a) => a.id === agentId) ?? agents[0]
  const emoji = categoryEmojis[agent.category] ?? '\uD83E\uDD16'

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex shrink-0 items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/agents/${agentId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-sm">
            {emoji}
          </div>
          <div>
            <h1 className="text-foreground text-sm font-semibold">{agent.name}</h1>
            <span className="text-xs text-green-600 dark:text-green-400">{t('agent.active')}</span>
          </div>
        </div>
        <button className="text-foreground text-xs font-medium hover:underline">
          {t('agent.edit')}
        </button>
      </div>

      {/* 2-panel layout */}
      <div className="flex min-h-0 flex-1">
        {/* Left: Chat area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-muted-foreground text-center text-sm">
              Chat with {agent.name} — give instructions, ask questions, or request actions.
            </p>
          </div>
          <div className="border-border shrink-0 border-t px-6 py-4">
            <div className="relative">
              <textarea
                placeholder={`Message ${agent.name}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={1}
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus:ring-ring min-h-[48px] w-full resize-none rounded-xl border py-3 pr-12 pl-4 text-sm focus:ring-2 focus:outline-none"
              />
              <button
                type="button"
                disabled={!message.trim()}
                className="bg-foreground text-background absolute top-1/2 right-3 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg transition-opacity disabled:opacity-40"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Action log / Results tabs */}
        <div className="border-border hidden w-[300px] shrink-0 border-l lg:flex lg:flex-col">
          {/* Tabs */}
          <div className="border-border flex shrink-0 border-b">
            {(['log', 'results'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-3 text-xs font-medium transition-colors',
                  activeTab === tab
                    ? 'text-foreground border-foreground border-b-2'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab === 'log' ? t('agent.actionLog') : t('agent.results')}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {activeTab === 'log' ? (
              <div className="relative">
                <div className="bg-border absolute top-2 bottom-2 left-[5px] w-px" />
                <div className="space-y-5">
                  {mockTimeline.map((item) => (
                    <div key={item.id} className="relative flex gap-4">
                      <div className="relative z-10 mt-1 shrink-0">
                        <span
                          className={cn(
                            'block h-[11px] w-[11px] rounded-full',
                            statusDot[item.status]
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-foreground text-sm leading-snug font-medium">
                            {item.title}
                          </p>
                          <span className="text-muted-foreground shrink-0 text-[10px]">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {mockResults.map((r) => (
                  <div key={r.label}>
                    <p className="text-muted-foreground mb-0.5 text-xs">{r.label}</p>
                    <p className="text-foreground text-xl font-medium">{r.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
