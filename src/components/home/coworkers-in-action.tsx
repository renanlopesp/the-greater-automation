'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { type AgentCard } from '@/data/home-dashboard'
import { useCoworkerAvatars } from '@/hooks/use-coworker-avatars'
import CoworkerAvatar from '@/components/coworker-avatar'

interface CoworkerInActionCard {
  id: string
  name: string
  summary: string
  resultLabel: string
  resultValue: string
}

const mockCoworkers: CoworkerInActionCard[] = [
  {
    id: 'abandoned-cart',
    name: 'Carrinho Abandonado',
    summary:
      '47 carrinhos abandonados nas últimas 8h, totalizando R$3.840 em risco. O co-worker identificou os clientes com maior probabilidade de conversão e já enviou 12 mensagens de recuperação.',
    resultLabel: 'Resultado recente',
    resultValue: 'R$3.840 em risco',
  },
  {
    id: 'sales-analyst',
    name: 'Sales Analyst',
    summary:
      'O co-worker identificou 34 clientes com alta propensão de compra nas últimas 8h e reengajou 12 carrinhos abandonados automaticamente.',
    resultLabel: 'Resultado recente',
    resultValue: '12 carrinhos reengajados',
  },
  {
    id: 'retention',
    name: 'Retenção',
    summary:
      '284 clientes estão inativos há 45+ dias, representando um risco de R$12.600 em receita. Campanha win-back aguarda aprovação.',
    resultLabel: 'Resultado recente',
    resultValue: 'Risco R$12.600',
  },
  {
    id: 'customer-service',
    name: 'Customer Service',
    summary:
      'O co-worker respondeu 156 perguntas automaticamente nas últimas 8h com 94% de satisfação e tempo médio de 2 minutos.',
    resultLabel: 'Resultado recente',
    resultValue: '2min médio · 94% satisfação',
  },
  {
    id: 'marketing-agent',
    name: 'Marketing Agent',
    summary:
      'O co-worker identificou 38 oportunidades de upsell com potencial de R$8.400/mês. Já enviou 28 e-mails personalizados e aguarda aprovação para 10 mensagens via WhatsApp para clientes VIP.',
    resultLabel: 'Resultado recente',
    resultValue: 'R$8.400/mês potencial',
  },
]

// Map mock IDs to actual coworker_avatars table IDs
const AVATAR_ID_MAP: Record<string, string> = {
  'abandoned-cart': 'abandoned-cart',
  'sales-analyst': 'revenue-intelligence',
  retention: 'upsell-retention',
  'customer-service': 'customer-service',
  'marketing-agent': 'conversion-optimizer',
}

interface CoworkersInActionProps {
  onSelectAgent: (agent: AgentCard) => void
  agents?: AgentCard[]
}

export default function CoworkersInAction({ onSelectAgent, agents }: CoworkersInActionProps) {
  const { avatars } = useCoworkerAvatars()

  return (
    <div>
      <h2 className="text-foreground mb-4 text-lg font-medium">Co-workers em ação</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mockCoworkers.map((cw) => {
          const avatarId = AVATAR_ID_MAP[cw.id] ?? cw.id
          const avatarUrl = avatars[avatarId]

          return (
            <div
              key={cw.id}
              onClick={() => {
                const match = agents?.find((a) => a.id === cw.id || a.name === cw.name)
                if (match) onSelectAgent(match)
              }}
              className="group border-border bg-background hover:border-foreground/50 flex cursor-pointer flex-col rounded-2xl border transition-colors"
            >
              <div className="flex flex-1 flex-col gap-3 p-7">
                <div className="flex items-center gap-2.5">
                  <CoworkerAvatar src={avatarUrl} name={cw.name} size="xs" />
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <p className="text-foreground text-sm leading-tight font-medium">{cw.name}</p>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                        style={{ backgroundColor: 'hsl(142 71% 45%)' }}
                      />
                      <span
                        className="relative inline-flex h-2 w-2 rounded-full"
                        style={{ backgroundColor: 'hsl(142 71% 45%)' }}
                      />
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-[13px] leading-relaxed">
                  {cw.summary}
                </p>
                <div className="border-border mt-auto border-t pt-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <p className="text-muted-foreground/60 mb-1 text-[11px]">{cw.resultLabel}</p>
                  <p className="text-muted-foreground text-[13px]">{cw.resultValue}</p>
                </div>
              </div>
            </div>
          )
        })}

        <Link
          href="/agents"
          className="border-border bg-background hover:border-foreground/30 hover:bg-muted/30 flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-7 transition-colors"
        >
          <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-full">
            <Plus className="text-muted-foreground h-3.5 w-3.5" />
          </div>
          <p className="text-muted-foreground text-sm">Adicionar co-worker</p>
        </Link>
      </div>
    </div>
  )
}
