'use client'

import { useState } from 'react'
import { useCoworkerAvatars } from '@/hooks/use-coworker-avatars'
import CoworkerAvatar from '@/components/coworker-avatar'
import { ChevronRight, Plus } from 'lucide-react'

interface AgentWorkspacePanelProps {
  agentId: string
  agentName: string
  category?: string
}

type WorkspaceTab = 'activity' | 'results' | 'edit' | 'connections'

// ── Mock data ─────────────────────────────────────────────────────
const todayData = {
  message:
    'Hoje 23 clientes deixaram o carrinho. Já entrei em contato com todos nos primeiros 15 minutos. 7 voltaram e compraram. Os outros 16 ainda estão na janela de 48h.',
  highlights: [
    { value: '23', label: 'carrinhos hoje' },
    { value: '7', label: 'já recuperados' },
    { value: 'R$890', label: 'receita de volta' },
  ],
}

const actionLogs = [
  {
    id: '1',
    label: 'Detectei 47 carrinhos abandonados hoje',
    time: '06:10',
    status: 'done' as const,
  },
  {
    id: '2',
    label: 'Priorizei por valor e intenção de compra',
    time: '06:12',
    status: 'done' as const,
  },
  {
    id: '3',
    label: 'Entrei em contato com 12 clientes — primeiros 15 minutos',
    time: '07:00',
    status: 'done' as const,
    badge: 'e-mail',
  },
  {
    id: '4',
    label: 'Acompanhando engajamento — 3 recuperados até agora',
    time: 'Agora',
    status: 'in_progress' as const,
    badge: 'agora',
  },
  {
    id: '5',
    label: '2ª onda agendada — toco diferente para os 9 que não abriram',
    time: '14:00',
    status: 'scheduled' as const,
  },
  {
    id: '6',
    label: 'Sequência WhatsApp pronta — só falta sua aprovação',
    time: 'Pendente',
    status: 'pending' as const,
  },
]

const resultKpis = [
  { value: 'R$1.260', label: 'Receita recuperada hoje', delta: '↑ +3 carrinhos' },
  { value: '27%', label: 'Taxa de recuperação', delta: '↑ +4pp vs. média' },
  { value: '47', label: 'Carrinhos identificados', delta: 'últimas 8h' },
]

const resultExtra = [{ label: 'Receita em risco', value: 'R$3.840', delta: 'valor total' }]

const files = [
  {
    name: 'Relatório de Carrinhos Abandonados — Mar 2026',
    type: 'PDF',
    size: '1.4 MB',
    description:
      'Análise completa dos carrinhos abandonados, segmentação por valor, canal de origem e taxa de recuperação por sequência.',
    date: 'Hoje, 08:00',
  },
  {
    name: 'Lista de Carrinhos Abandonados — 10 mar',
    type: 'CSV',
    size: '76 KB',
    description:
      '47 carrinhos exportados com cliente, produto, valor, score de intenção e status de recuperação.',
    date: 'Hoje, 06:12',
  },
  {
    name: 'Funil de Recuperação — Semana 10',
    type: 'Chart',
    size: '310 KB',
    description:
      'Visualização do funil: carrinhos identificados → mensagens enviadas → aberturas → cliques → conversões.',
    date: 'Ontem, 20:00',
  },
  {
    name: 'Performance das Mensagens de Recuperação',
    type: 'Chart',
    size: '240 KB',
    description:
      'Taxa de abertura, clique e conversão por template de mensagem e canal (e-mail vs. WhatsApp).',
    date: 'Ontem, 20:01',
  },
]

const connections = [
  { name: 'Shopify', status: 'Active' },
  { name: 'Gmail', status: 'Active' },
  { name: 'WhatsApp', status: 'Active' },
]

export default function AgentWorkspacePanel({ agentName, category }: AgentWorkspacePanelProps) {
  const [tab, setTab] = useState<WorkspaceTab>('activity')
  const { avatars } = useCoworkerAvatars()

  const workspaceTabs: { id: WorkspaceTab; label: string }[] = [
    { id: 'activity', label: 'hoje' },
    { id: 'results', label: 'resultados' },
    { id: 'edit', label: 'configurar' },
    { id: 'connections', label: 'conexões' },
  ]

  const slug = agentName.toLowerCase().replace(/\s+/g, '-')
  const avatarUrl = avatars[slug] || Object.values(avatars)[0]

  return (
    <div className="bg-muted/40 flex h-full flex-col">
      {/* White rounded container: tab bar + content */}
      <div className="border-border/40 bg-background m-3 ml-1.5 flex flex-1 flex-col overflow-hidden rounded-2xl border shadow-sm">
        {/* Tab bar — centered, pill style */}
        <div className="flex shrink-0 items-center justify-center gap-1.5 px-5 pt-4 pb-3">
          {workspaceTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                tab === t.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <div className="mx-auto w-full max-w-[800px]">
            {/* ── Activity tab ── */}
            {tab === 'activity' && (
              <div className="space-y-4">
                {/* Intro card: centered avatar + message + mini stats */}
                <div className="flex flex-col items-center gap-6 py-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative flex items-center justify-center">
                      {/* Pulse rings */}
                      <span
                        className="border-border/40 absolute h-36 w-36 animate-ping rounded-full border"
                        style={{ animationDuration: '2.5s', animationTimingFunction: 'ease-out' }}
                      />
                      <span
                        className="border-border/50 absolute h-32 w-32 animate-ping rounded-full border"
                        style={{
                          animationDuration: '2.5s',
                          animationDelay: '0.4s',
                          animationTimingFunction: 'ease-out',
                        }}
                      />
                      <CoworkerAvatar src={avatarUrl} name={agentName} size="xl" />
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-foreground/90 text-[14px] font-semibold">
                        {agentName}
                      </span>
                      <span className="text-muted-foreground text-[12px]">
                        {category || 'Customer Service'}
                      </span>
                    </div>
                  </div>

                  <p className="text-foreground/75 max-w-[520px] text-[15px] leading-relaxed">
                    {todayData.message}
                  </p>

                  {/* Mini stats */}
                  <div className="border-border grid w-full grid-cols-3 overflow-hidden rounded-xl border">
                    {todayData.highlights.map((h, i) => (
                      <div
                        key={i}
                        className={`flex flex-col items-center gap-0.5 px-3 py-4 text-center ${
                          i < 2 ? 'border-border border-r' : ''
                        }`}
                      >
                        <span className="text-foreground/90 text-[20px] leading-none font-semibold tabular-nums">
                          {h.value}
                        </span>
                        <span className="text-muted-foreground/55 mt-0.5 text-[10px] leading-snug">
                          {h.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity list — single bordered container with dividers */}
                <div className="border-border overflow-hidden rounded-xl border">
                  {actionLogs.map((log, i) => {
                    const isLive = log.status === 'in_progress'
                    const isPending = log.status === 'pending'

                    return (
                      <div key={log.id} className={i > 0 ? 'border-border border-t' : ''}>
                        <div
                          className="flex cursor-pointer items-center gap-3 select-none"
                          style={{
                            padding: '11px 14px',
                            backgroundColor: isLive ? 'rgba(29,158,117,0.04)' : 'transparent',
                          }}
                        >
                          {/* Status dot */}
                          <span
                            className={`shrink-0 ${isLive ? 'animate-pulse' : ''}`}
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              display: 'block',
                              backgroundColor: isLive
                                ? '#1D9E75'
                                : isPending
                                  ? 'transparent'
                                  : 'hsl(var(--border))',
                              border: isPending ? '1.5px dashed hsl(var(--border))' : 'none',
                            }}
                          />

                          {/* Title */}
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-[13px] leading-snug"
                              style={{
                                color: isPending
                                  ? 'hsl(var(--muted-foreground))'
                                  : isLive
                                    ? 'hsl(var(--foreground))'
                                    : 'hsl(var(--foreground) / 0.75)',
                                fontWeight: isLive || isPending ? 500 : 400,
                              }}
                            >
                              {log.label}
                            </p>
                          </div>

                          {/* Right: time + badge + chevron */}
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-muted-foreground/50 text-[11px]">{log.time}</span>
                            {log.badge && (
                              <span
                                className="text-[10px] font-medium"
                                style={{
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  backgroundColor:
                                    log.badge === 'agora'
                                      ? 'rgba(29,158,117,0.1)'
                                      : log.badge === 'e-mail'
                                        ? 'hsl(var(--destructive) / 0.1)'
                                        : 'hsl(var(--muted))',
                                  color:
                                    log.badge === 'agora'
                                      ? '#1D9E75'
                                      : log.badge === 'e-mail'
                                        ? 'hsl(var(--destructive))'
                                        : 'hsl(var(--muted-foreground))',
                                }}
                              >
                                {log.badge}
                              </span>
                            )}
                            <ChevronRight className="text-muted-foreground/40 h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Results tab ── */}
            {tab === 'results' && (
              <div className="space-y-6">
                <div className="border-border grid grid-cols-3 overflow-hidden rounded-xl border">
                  {resultKpis.map((r, i) => (
                    <div
                      key={i}
                      className={`flex flex-col items-center gap-0.5 px-3 py-4 text-center ${
                        i < 2 ? 'border-border border-r' : ''
                      }`}
                    >
                      <span className="text-foreground/90 text-[19px] leading-none font-semibold tabular-nums">
                        {r.value}
                      </span>
                      <span className="text-muted-foreground/60 mt-1 text-[10px] leading-snug">
                        {r.label}
                      </span>
                      {r.delta && (
                        <span className="text-foreground/50 mt-0.5 text-[9.5px] leading-tight">
                          {r.delta}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {resultExtra.map((r, i) => (
                  <div key={i}>
                    <p className="text-muted-foreground/60 text-[11px]">{r.label}</p>
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="text-foreground/85 text-lg font-semibold">{r.value}</span>
                      {r.delta && (
                        <span className="text-muted-foreground/50 text-[11px]">{r.delta}</span>
                      )}
                    </div>
                  </div>
                ))}

                <div className="border-border border-t" />

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-muted-foreground text-xs">Generated files</p>
                    <span className="text-muted-foreground text-xs">{files.length} files</span>
                  </div>
                  <div className="space-y-3">
                    {files.map((file, i) => (
                      <div key={i} className="border-border rounded-xl border p-4">
                        <p className="text-foreground text-sm font-medium">{file.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="bg-muted rounded px-1.5 py-0.5 text-[10px]">
                            {file.type}
                          </span>
                          <span className="text-muted-foreground text-[10px]">{file.size}</span>
                        </div>
                        <p className="text-muted-foreground mt-2 text-xs">{file.description}</p>
                        <p className="text-muted-foreground mt-2 text-[10px]">{file.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Configure tab ── */}
            {tab === 'edit' && (
              <div className="space-y-6">
                <p className="text-muted-foreground text-xs">Configuration</p>
                <div className="space-y-5">
                  {[
                    {
                      label: 'Run schedule',
                      options: ['Every hour', 'Every 6 hours', 'Daily', 'Weekly'],
                      defaultIdx: 2,
                    },
                    {
                      label: 'Notification channel',
                      options: ['In-app only', 'Email', 'Slack', 'Email + Slack'],
                      defaultIdx: 0,
                    },
                  ].map((field) => (
                    <div key={field.label} className="flex items-center justify-between">
                      <p className="text-foreground text-sm">{field.label}</p>
                      <select
                        defaultValue={field.options[field.defaultIdx]}
                        className="border-border bg-background rounded-md border px-3 py-1.5 text-sm"
                      >
                        {field.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <p className="text-foreground text-sm">Auto-execute actions</p>
                    <button className="bg-muted-foreground/20 relative h-5 w-9 rounded-full">
                      <span className="bg-background absolute top-0.5 left-0.5 h-4 w-4 rounded-full shadow" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-foreground text-sm">Escalation threshold</p>
                    <select
                      defaultValue="Medium"
                      className="border-border bg-background rounded-md border px-3 py-1.5 text-sm"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-3 text-xs">Connected tools</p>
                  <div className="flex gap-2">
                    {connections.map((c) => (
                      <span
                        key={c.name}
                        className="border-border flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="bg-foreground text-background w-full rounded-xl py-2.5 text-sm font-medium transition-opacity hover:opacity-90">
                  Save changes
                </button>
              </div>
            )}

            {/* ── Connections tab ── */}
            {tab === 'connections' && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-xs">Connected sources</p>
                {connections.map((conn) => (
                  <div
                    key={conn.name}
                    className="border-border flex items-center justify-between rounded-xl border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-muted-foreground/40 h-2 w-2 rounded-full" />
                      <span className="text-foreground text-sm">{conn.name}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{conn.status}</span>
                  </div>
                ))}
                <button className="border-border text-muted-foreground hover:border-foreground/30 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm transition-colors">
                  <Plus className="h-4 w-4" />
                  Add connection
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
