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

function extractTypicalOutcome(detailedDescription: string): string {
  const lines = detailedDescription.split('\n')
  const expectedIdx = lines.findIndex((l) => l.toLowerCase().includes('expected outcomes'))
  if (expectedIdx === -1) return ''

  const outcomes: string[] = []
  for (let i = expectedIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (line.startsWith('\u2022') || line.startsWith('-')) {
      outcomes.push(line.replace(/^[\u2022\-]\s*/, ''))
      if (outcomes.length >= 1) break
    }
  }
  return outcomes[0] ?? ''
}

interface AgentCardProps {
  agent: Agent
  onClick: (agent: Agent) => void
}

export default function AgentCard({ agent, onClick }: AgentCardProps) {
  const { t } = useLanguage()
  const emoji = categoryEmojis[agent.category] ?? '\uD83E\uDD16'
  const typicalOutcome = extractTypicalOutcome(agent.detailedDescription)

  return (
    <button
      onClick={() => onClick(agent)}
      className="group border-border bg-background hover:border-foreground/50 flex cursor-pointer flex-col rounded-2xl border text-left transition-colors"
    >
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm">
            {emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm leading-tight font-medium">
              {agent.name}
            </p>
            <p className="text-muted-foreground text-[11px]">{agent.category}</p>
          </div>
        </div>

        <p className="text-muted-foreground line-clamp-2 text-[13px] leading-relaxed">
          {agent.description}
        </p>

        {typicalOutcome && (
          <div className="border-border mt-auto border-t pt-3">
            <p className="text-muted-foreground/60 mb-0.5 text-[11px]">
              {t('discover.typicalOutcome')}
            </p>
            <p className="text-muted-foreground text-[12px] leading-snug">{typicalOutcome}</p>
          </div>
        )}
      </div>
    </button>
  )
}
