'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import GreetingSectionNew from './greeting-section-new'
import MetricsCards from './metrics-cards'
import AskBar from './ask-bar'
import CoworkerRecommendation from './coworker-recommendation'
import CoworkersInAction from './coworkers-in-action'
import OpportunitiesSection from './opportunities-section'
import { scenarios, type AgentCard, type Metric } from '@/data/home-dashboard'

export interface HomeClientNewProps {
  /** Real agents from database, transformed to AgentCard shape */
  agents?: AgentCard[]
  /** Real metrics from database */
  metrics?: Metric[]
  /** Team name for personalized greeting */
  teamName?: string
  /** Logged-in user's display name */
  userName?: string
}

// ── Status dot config ────────────────────────────────────────────
const statusDotClass: Record<string, string> = {
  done: 'bg-foreground/30',
  running: 'bg-foreground/60',
  scheduled: 'bg-muted-foreground/40 border border-border',
  pending: 'bg-foreground/60',
}

// ── Agent Drawer ─────────────────────────────────────────────────
function AgentDrawer({ agent, onClose }: { agent: AgentCard; onClose: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const isWarning = agent.badge.color === 'amber'

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        className="bg-background border-border fixed inset-0 z-50 flex flex-col overflow-hidden border shadow-xl transition-transform duration-300 ease-out sm:top-4 sm:right-4 sm:bottom-4 sm:left-auto sm:w-[520px] sm:rounded-2xl"
        style={{
          transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 1rem))',
        }}
      >
        <div className="border-border flex shrink-0 items-start justify-between border-b px-8 pt-8 pb-5">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg">
              {agent.emoji}
            </div>
            <div>
              <h2 className="text-foreground text-lg leading-tight font-medium">{agent.name}</h2>
              {!(
                (agent.badge.color === 'green' || agent.badge.color === 'blue') &&
                agent.pulse
              ) && (
                <span className="text-muted-foreground border-border inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]">
                  {isWarning && <span>{'\u26A0'}</span>}
                  {agent.badge.label}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground mt-0.5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-7">
          <p className="text-foreground text-sm leading-relaxed">{agent.summary}</p>
          <div className="border-border my-6 border-t" />
          <div>
            <p className="text-muted-foreground mb-4 text-xs">Resultados</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {agent.kpis.map((kpi) => (
                <div key={kpi.label}>
                  <p className="text-muted-foreground mb-0.5 text-xs">{kpi.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-foreground text-xl font-medium">{kpi.value}</span>
                    {kpi.sub && <span className="text-muted-foreground text-xs">{kpi.sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-border my-6 border-t" />
          <div>
            <p className="text-muted-foreground mb-4 text-xs font-medium">Log de ações</p>
            <div className="relative">
              <div className="bg-border absolute top-2 bottom-2 left-[5px] w-px" />
              <div className="space-y-0">
                {agent.actions.map((action, i) => (
                  <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
                    <div className="relative z-10 mt-[3px] shrink-0">
                      <span
                        className={`border-background block h-[11px] w-[11px] rounded-full border-2 ${statusDotClass[action.status]}`}
                      />
                    </div>
                    <div className="-mt-0.5 min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm leading-snug ${
                            action.status === 'done'
                              ? 'text-muted-foreground'
                              : 'text-foreground font-medium'
                          }`}
                        >
                          {action.label}
                        </p>
                        <span className="text-muted-foreground mt-0.5 shrink-0 text-[10px]">
                          {action.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-border flex flex-col items-center gap-3 border-t px-8 py-6">
          <button className="bg-foreground text-background flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90">
            {agent.inactive ? 'Ativar agente' : 'Abrir workspace do agente'}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── Main Component ───────────────────────────────────────────────
export default function HomeClientNew({
  agents,
  metrics,
  teamName,
  userName,
}: HomeClientNewProps = {}) {
  const [now, setNow] = useState(() => new Date())
  const [scenarioIdx, setScenarioIdx] = useState(0)
  const [selectedAgent, setSelectedAgent] = useState<AgentCard | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const isLive = scenarioIdx === 0
  const scenario = scenarios[scenarioIdx]
  const cycleScenario = () => setScenarioIdx((i) => (i + 1) % scenarios.length)

  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-16 px-6 py-10">
        <GreetingSectionNew
          now={now}
          scenario={scenario}
          scenarioIdx={scenarioIdx}
          totalScenarios={scenarios.length}
          isLive={isLive}
          onCycleScenario={cycleScenario}
          userName={userName}
        />

        <MetricsCards metrics={metrics ?? scenario.metrics} scenarioIdx={scenarioIdx} />

        <AskBar />

        <div className="border-border border-t" />

        <CoworkerRecommendation />

        <CoworkersInAction onSelectAgent={setSelectedAgent} agents={agents} />

        <OpportunitiesSection />

        <div className="h-10" />
      </div>

      {selectedAgent && (
        <AgentDrawer agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  )
}
