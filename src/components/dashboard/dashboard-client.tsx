'use client'

import { useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Bot, MessageCircle, Play } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import AgentsGrid from '@/components/dashboard/agents-grid'
import type { AgentCardProps } from '@/components/dashboard/agent-card'

interface OrchestratorData {
  id: string
  name: string
  description: string | null
  palette: string
}

interface DashboardClientProps {
  team: { name: string; avatar_url: string | null }
  orchestrator: OrchestratorData | null
  initialAgents: AgentCardProps[]
  runsToday: number
  connectedApp?: string
  connectionError?: string
}

const stats = [
  { label: 'Agentes', icon: Bot, value: 0 },
  { label: 'Execuções hoje', icon: Play, value: 0 },
]

export default function DashboardClient({
  orchestrator,
  initialAgents,
  runsToday,
  connectedApp,
  connectionError,
}: DashboardClientProps) {
  const toastShown = useRef(false)

  useEffect(() => {
    if (toastShown.current) return
    if (connectedApp) {
      toastShown.current = true
      toast.success(
        `${connectedApp.charAt(0).toUpperCase() + connectedApp.slice(1)} conectado com sucesso`
      )
    } else if (connectionError) {
      toastShown.current = true
      toast.error(`Falha na conexão: ${connectionError.replace(/_/g, ' ')}`)
    }
  }, [connectedApp, connectionError])

  const computedStats = useMemo(
    () => [
      { ...stats[0], value: initialAgents.length },
      { ...stats[1], value: runsToday },
    ],
    [initialAgents.length, runsToday]
  )

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pt-12 pb-12">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">Painel</h2>
        <p className="text-muted-foreground text-sm">
          Visão geral dos agentes e automações da sua equipe.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        {computedStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 pt-0">
              <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
                <stat.icon className="text-primary h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold">{stat.value}</span>
                <span className="text-muted-foreground text-xs">{stat.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orchestrator — primary chat entry point */}
      {orchestrator && (
        <section className="flex flex-col gap-3">
          <Link href={`/agents/${orchestrator.id}`}>
            <Card className="border-primary/20 bg-primary/5 hover:border-primary/40 transition-colors">
              <CardContent className="flex items-center gap-4 pt-0">
                <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                  <MessageCircle className="text-primary h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold">{orchestrator.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {orchestrator.description ??
                      'Seu assistente central — pergunte qualquer coisa.'}
                  </p>
                </div>
                <span className="text-primary text-sm font-medium whitespace-nowrap">
                  Abrir Chat &rarr;
                </span>
              </CardContent>
            </Card>
          </Link>
        </section>
      )}

      {/* Agents */}
      <AgentsGrid agents={initialAgents} />
    </div>
  )
}
