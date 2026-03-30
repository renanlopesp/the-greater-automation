'use client'

import { Check, Circle, ChevronRight, MessageCircle, Mail, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

type ItemStatus = 'done' | 'pending'

interface SummaryItem {
  id: string
  status: ItemStatus
  title: string
  skill: string
  metric: string
  time?: string
  badge?: string
}

const DAILY_SUMMARY = {
  title: 'O que o Snew fez hoje',
  subtitle: 'Segunda-feira · 4 ações executadas · 1 aguardando você',
  items: [
    {
      id: 'a1',
      status: 'done' as const,
      title: 'Reposição aprovada: Body Comfy · 50 unidades',
      skill: 'Inventory Manager',
      metric: 'Evitou ruptura R$ 8.600',
      time: '07:02',
    },
    {
      id: 'a2',
      status: 'done' as const,
      title: 'E-mail VIP Dia das Mães · 847 contatos',
      skill: 'Copywriter',
      metric: 'Receita estimada R$ 12.400',
      time: '07:15',
    },
    {
      id: 'a3',
      status: 'done' as const,
      title: 'Review negativo respondido · Google',
      skill: 'Post-Purchase',
      metric: 'NPS protegido',
      time: '07:18',
    },
    {
      id: 'a4',
      status: 'done' as const,
      title: 'Sequência WhatsApp ativada · 4 clientes VIP',
      skill: 'Retention Engine',
      metric: 'LTV R$ 4.200 em risco',
      time: '07:20',
    },
    {
      id: 'a5',
      status: 'pending' as const,
      title: 'Publicar Reels emocional · aprovação necessária',
      skill: 'Video Script Creator',
      metric: 'Alcance estimado 8.400',
      badge: 'aguardando você',
    },
  ] satisfies SummaryItem[],
}

interface StatusIconProps {
  status: ItemStatus
}

function StatusIcon({ status }: StatusIconProps) {
  if (status === 'done') {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: 20,
          height: 20,
          background: 'color-mix(in srgb, var(--green) 10%, transparent)',
          color: 'var(--green)',
        }}
      >
        <Check style={{ width: 11, height: 11, strokeWidth: 2.5 }} />
      </div>
    )
  }
  return (
    <Circle
      className="shrink-0"
      style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }}
    />
  )
}

export default function DailySummaryArtifact() {
  const { title, subtitle, items } = DAILY_SUMMARY

  return (
    <div>
      {/* Title */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: 'var(--foreground)',
          marginBottom: 4,
        }}
      >
        {title}
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 13,
          color: 'var(--muted-foreground)',
          marginBottom: 24,
        }}
      >
        {subtitle}
      </p>

      {/* Items */}
      <div>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <div
              key={item.id}
              className="flex cursor-pointer items-start justify-between"
              style={{
                padding: '16px 0',
                borderBottom: isLast ? 'none' : '1px solid var(--border)',
              }}
            >
              {/* Left side */}
              <div className="flex min-w-0 flex-1 gap-3">
                <StatusIcon status={item.status} />
                <div className="min-w-0">
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--foreground)',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--muted-foreground)',
                      marginTop: 2,
                    }}
                  >
                    {item.skill} · {item.metric}
                  </p>
                </div>
              </div>

              {/* Right side */}
              <div className="flex shrink-0 items-center gap-2 pl-3">
                {item.time && (
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--muted-foreground)',
                      minWidth: 40,
                      textAlign: 'right',
                    }}
                  >
                    {item.time}
                  </span>
                )}
                {item.badge && (
                  <span
                    style={{
                      fontSize: 11,
                      color: '#D97706',
                      fontWeight: 500,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                <ChevronRight style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
