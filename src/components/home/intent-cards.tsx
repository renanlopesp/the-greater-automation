'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface IntentCard {
  id: string
  themeColor: string
  themeDotColor: string
  themePillText: string
  emoji: string
  title: string
  agentCount: number
}

const CARD_POOL: IntentCard[] = [
  {
    id: 'brand-visibility',
    themeColor: 'bg-[hsl(190,10%,92%)]',
    themeDotColor: 'bg-foreground/40',
    themePillText: 'AI-Friendly Store',
    emoji: '🤖',
    title: 'Sua loja aparece quando o ChatGPT recomenda produtos?',
    agentCount: 6,
  },
  {
    id: 'weekend-campaign',
    themeColor: 'bg-[hsl(270,8%,92%)]',
    themeDotColor: 'bg-foreground/40',
    themePillText: 'marketing',
    emoji: '📣',
    title: 'Crie uma campanha completa para todos os canais em 10 minutos.',
    agentCount: 5,
  },
  {
    id: 'catalog-seo',
    themeColor: 'bg-[hsl(120,6%,91%)]',
    themeDotColor: 'bg-foreground/40',
    themePillText: 'catálogo',
    emoji: '📦',
    title: 'Seus títulos de produto estão perdendo buscas no Google e na IA.',
    agentCount: 3,
  },
  {
    id: 'abandoned-cart',
    themeColor: 'bg-[hsl(220,14%,93%)]',
    themeDotColor: 'bg-foreground/50',
    themePillText: 'conversão',
    emoji: '🛒',
    title: 'Por que seus clientes abandonam no checkout?',
    agentCount: 3,
  },
  {
    id: 'churn-risk',
    themeColor: 'bg-[hsl(0,6%,92%)]',
    themeDotColor: 'bg-foreground/40',
    themePillText: 'retenção',
    emoji: '📉',
    title: '284 clientes em risco de churn esta semana.',
    agentCount: 4,
  },
  {
    id: 'competitor-price',
    themeColor: 'bg-[hsl(200,12%,92%)]',
    themeDotColor: 'bg-foreground/40',
    themePillText: 'competitividade',
    emoji: '🔍',
    title: 'Seu concorrente mudou os preços às 3h da manhã.',
    agentCount: 2,
  },
  {
    id: 'upsell-vip',
    themeColor: 'bg-[hsl(40,10%,92%)]',
    themeDotColor: 'bg-foreground/40',
    themePillText: 'receita',
    emoji: '💰',
    title: '38 clientes VIP prontos para comprar mais.',
    agentCount: 3,
  },
  {
    id: 'cs-tickets',
    themeColor: 'bg-[hsl(210,12%,93%)]',
    themeDotColor: 'bg-foreground/40',
    themePillText: 'suporte',
    emoji: '💬',
    title: '156 tickets respondidos sem intervenção humana.',
    agentCount: 2,
  },
  {
    id: 'mobile-checkout',
    themeColor: 'bg-[hsl(220,14%,93%)]',
    themeDotColor: 'bg-foreground/50',
    themePillText: 'conversão',
    emoji: '📱',
    title: 'Abandono mobile 34% maior que desktop. Por quê?',
    agentCount: 2,
  },
  {
    id: 'whatsapp-recovery',
    themeColor: 'bg-[hsl(0,6%,92%)]',
    themeDotColor: 'bg-foreground/40',
    themePillText: 'retenção',
    emoji: '💌',
    title: 'WhatsApp converte 2,8× mais que e-mail na recuperação.',
    agentCount: 3,
  },
  {
    id: 'peak-traffic',
    themeColor: 'bg-[hsl(30,10%,92%)]',
    themeDotColor: 'bg-foreground/40',
    themePillText: 'performance',
    emoji: '⚡',
    title: 'Pico de tráfego em 2 horas. Tudo pronto?',
    agentCount: 4,
  },
  {
    id: 'price-margin',
    themeColor: 'bg-[hsl(40,10%,92%)]',
    themeDotColor: 'bg-foreground/40',
    themePillText: 'receita',
    emoji: '📊',
    title: 'Quais produtos têm margem para ajuste sem perder conversão?',
    agentCount: 2,
  },
]

const CARDS_PER_PAGE = 3
const TOTAL_PAGES = Math.ceil(CARD_POOL.length / CARDS_PER_PAGE)

export default function IntentCards() {
  const [page, setPage] = useState(0)
  const [activeCard, setActiveCard] = useState<IntentCard | null>(null)

  const visibleCards = CARD_POOL.slice(
    page * CARDS_PER_PAGE,
    page * CARDS_PER_PAGE + CARDS_PER_PAGE
  )

  const prev = () => setPage((p) => Math.max(0, p - 1))
  const next = () => setPage((p) => Math.min(TOTAL_PAGES - 1, p + 1))

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <button
            onClick={prev}
            disabled={page === 0}
            className="border-border bg-background hover:bg-muted absolute top-1/2 -left-5 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft className="text-muted-foreground h-4 w-4" />
          </button>

          <div className="grid grid-cols-3 gap-3 overflow-hidden">
            {visibleCards.map((card) => (
              <div
                key={card.id}
                onClick={() => setActiveCard(card)}
                className="border-border bg-background group flex cursor-pointer flex-col overflow-hidden rounded-xl border"
              >
                <div
                  className={`${card.themeColor} flex aspect-video w-full items-center justify-center`}
                >
                  <span className="text-[32px] leading-none select-none">{card.emoji}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2 px-6 pt-5 pb-6">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-[5px] w-[5px] shrink-0 rounded-full ${card.themeDotColor}`}
                    />
                    <span className="text-muted-foreground/60 text-[10px]">
                      {card.themePillText}
                    </span>
                  </div>
                  <p className="text-foreground/85 text-[13.5px] leading-snug font-[500]">
                    {card.title}
                  </p>
                  <div className="border-border/60 mt-auto flex items-center border-t pt-2">
                    <span className="text-muted-foreground/40 text-[10px]">
                      {card.agentCount} co-worker{card.agentCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={next}
            disabled={page === TOTAL_PAGES - 1}
            className="border-border bg-background hover:bg-muted absolute top-1/2 -right-5 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-1 rounded-full transition-all ${
                i === page ? 'bg-foreground/40 w-3' : 'bg-muted-foreground/25 w-1'
              }`}
            />
          ))}
        </div>
      </div>

      {activeCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setActiveCard(null)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="bg-background border-border relative z-10 mx-4 w-full max-w-md overflow-hidden rounded-2xl border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-border flex items-start justify-between gap-3 border-b px-7 pt-7 pb-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-[5px] w-[5px] shrink-0 rounded-full ${activeCard.themeDotColor}`}
                  />
                  <span className="text-muted-foreground/60 text-[10px]">
                    {activeCard.themePillText}
                  </span>
                </div>
                <p className="text-foreground text-[14px] leading-snug font-medium">
                  {activeCard.title}
                </p>
              </div>
              <button
                onClick={() => setActiveCard(null)}
                className="hover:bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors"
              >
                <X className="text-muted-foreground h-3.5 w-3.5" />
              </button>
            </div>
            <div className="border-border border-t px-7 py-5">
              <button
                onClick={() => setActiveCard(null)}
                className="text-muted-foreground/60 hover:text-foreground text-[11.5px] transition-colors"
              >
                ver todos no catálogo →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
