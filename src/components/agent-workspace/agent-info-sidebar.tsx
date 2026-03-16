'use client'

import { useLanguage } from '@/contexts/language-context'
import type { Agent } from '@/data/agents'

const categoryEmojis: Record<string, string> = {
  'Customer Service': '\uD83C\uDFE7',
  Marketing: '\uD83D\uDCE3',
  Competitors: '\uD83D\uDD0D',
  Analytics: '\uD83D\uDCCA',
  Audit: '\uD83D\uDEE1\uFE0F',
  Productivity: '\u26A1',
}

interface AgentInfoSidebarProps {
  agent: Agent
}

export default function AgentInfoSidebar({ agent }: AgentInfoSidebarProps) {
  const { t } = useLanguage()
  const emoji = categoryEmojis[agent.category] ?? '\uD83E\uDD16'

  const channels = [
    { name: 'Email', status: 'Active' as const },
    { name: 'WhatsApp', status: 'Coming soon' as const },
    { name: 'Telegram', status: 'Coming soon' as const },
  ]

  return (
    <div className="border-border bg-background flex h-full flex-col border-l">
      <div className="space-y-4 px-6 py-6">
        {/* Agent avatar & name */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full text-2xl">
            {emoji}
          </div>
          <div>
            <h1 className="text-foreground text-lg font-semibold">{agent.name}</h1>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {t('agent.active')}
              </span>
              <span className="text-muted-foreground text-xs">Last active: 2 min ago</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-[13px] leading-relaxed">{agent.description}</p>

        {/* Run Agent button */}
        <button className="bg-foreground text-background flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90">
          {t('agent.runAgent')}
        </button>
      </div>

      {/* Channels */}
      <div className="border-border border-t px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {t('agent.channels')}
          </h3>
          <button className="text-foreground text-xs font-medium hover:underline">Connect</button>
        </div>
        <div className="space-y-2.5">
          {channels.map((ch) => (
            <div key={ch.name} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{ch.name}</span>
              <span
                className={
                  ch.status === 'Active'
                    ? 'text-xs text-green-600 dark:text-green-400'
                    : 'text-muted-foreground text-xs'
                }
              >
                {ch.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
