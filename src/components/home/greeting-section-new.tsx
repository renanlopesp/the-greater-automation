'use client'

import type { Scenario } from '@/data/home-dashboard'
import { getDynamicGreeting } from '@/data/home-dashboard'

interface GreetingSectionProps {
  now: Date
  scenario: Scenario
  scenarioIdx: number
  totalScenarios: number
  isLive: boolean
  onCycleScenario: () => void
  userName?: string
}

export default function GreetingSectionNew({
  now,
  scenario,
  scenarioIdx,
  totalScenarios,
  isLive,
  onCycleScenario,
  userName,
}: GreetingSectionProps) {
  const liveTimeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const liveDateStr = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const { heading: liveHeading } = getDynamicGreeting(now, userName)

  const activeHeading = isLive ? liveHeading : scenario.heading
  const activeDateStr = isLive ? liveDateStr : scenario.dateStr
  const activeTimeStr = isLive ? liveTimeStr : scenario.timeStr

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground/60 text-xs font-normal">
          {activeDateStr} &middot; {activeTimeStr}
        </p>
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground/60 text-xs font-normal">
            Última atualização: 2 min atrás
          </p>
          <button
            onClick={onCycleScenario}
            className="text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors"
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isLive ? 'bg-foreground/40' : 'bg-foreground/20'
              }`}
            />
            {scenario.label}
            <span className="text-muted-foreground/40 text-[10px]">
              {scenarioIdx + 1}/{totalScenarios}
            </span>
          </button>
        </div>
      </div>
      <h1
        className="text-foreground animate-fade-in text-3xl leading-tight font-semibold"
        key={scenarioIdx}
      >
        {activeHeading}
      </h1>
    </div>
  )
}
