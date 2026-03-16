'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Action {
  id: string
  title: string
  channel: 'WhatsApp' | 'Email'
  goal: string
  messagePreview: string
  active: boolean
}

const channelColors: Record<string, string> = {
  WhatsApp: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Email: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const initialActions: Action[] = [
  {
    id: 'ra1',
    title: 'Win-back Campaign — Inactive 45+ days',
    channel: 'WhatsApp',
    goal: 'Recover R$12,600 from 284 inactive customers',
    messagePreview:
      'Oi {name}, sentimos sua falta! Preparamos uma oferta especial de 15% para sua volta...',
    active: true,
  },
  {
    id: 'ra2',
    title: 'Delivery Delay Proactive Notification',
    channel: 'WhatsApp',
    goal: 'Reduce support tickets from delayed deliveries',
    messagePreview:
      'Oi {name}, seu pedido #{order} está com um pequeno atraso. Novo prazo estimado: {date}...',
    active: true,
  },
  {
    id: 'ra3',
    title: 'Post-Delivery Review Request',
    channel: 'Email',
    goal: 'Collect 35-40 new reviews from recent buyers',
    messagePreview:
      'Obrigado pela compra! Que tal compartilhar sua experiência? Leva menos de 1 minuto...',
    active: false,
  },
  {
    id: 'ra4',
    title: 'VIP Thank-You & Early Access',
    channel: 'Email',
    goal: 'Increase VIP retention and share of wallet',
    messagePreview:
      'Você é um dos nossos clientes mais especiais. Como agradecimento, acesso antecipado à...',
    active: false,
  },
]

export default function RecommendedActions() {
  const [actions, setActions] = useState(initialActions)

  const toggleActive = (id: string) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)))
  }

  return (
    <div>
      <h2 className="text-foreground mb-4 text-lg font-medium">Recommended Actions</h2>
      <div className="space-y-3">
        {actions.map((action) => (
          <div
            key={action.id}
            className="border-border bg-background space-y-3 rounded-xl border p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-foreground text-sm font-medium">{action.title}</p>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    channelColors[action.channel]
                  )}
                >
                  {action.channel}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button className="text-muted-foreground hover:text-foreground text-xs">
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(action.id)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    action.active
                      ? 'bg-foreground text-background'
                      : 'border-border text-foreground hover:bg-muted border'
                  )}
                >
                  {action.active ? 'Active' : 'Activate'}
                </button>
              </div>
            </div>
            <p className="text-muted-foreground text-[13px]">{action.goal}</p>
            <p className="text-muted-foreground/70 text-[12px] italic">
              &ldquo;{action.messagePreview}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
