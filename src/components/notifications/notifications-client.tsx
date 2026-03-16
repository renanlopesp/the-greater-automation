'use client'

import { useState } from 'react'
import { CheckCheck } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'

interface Notification {
  id: string
  coworker: string
  category: string
  urgency: 'urgent' | 'opportunity' | 'insight'
  title: string
  reasoning: string
  cta: string
  read: boolean
}

const notifications: Notification[] = [
  {
    id: '1',
    coworker: 'Conversion Optimizer',
    category: 'Marketing',
    urgency: 'urgent',
    title: 'Add Apple Pay & Google Pay to checkout',
    reasoning:
      'Mobile checkout drop-off spiked to 74% (up from 61%). Friction is isolated to the payment step — no express options available.',
    cta: 'Review checkout flow',
    read: false,
  },
  {
    id: '2',
    coworker: 'Competitor Watch',
    category: 'Competitors',
    urgency: 'urgent',
    title: "Counter BrandX's price drop on your top SKUs",
    reasoning:
      'BrandX cut prices by 8% on 3 products in your top category. ShopCo also launched a buy-2-get-1. No response yet from your side.',
    cta: 'Adjust pricing strategy',
    read: false,
  },
  {
    id: '3',
    coworker: 'Customer Service',
    category: 'Customer Service',
    urgency: 'opportunity',
    title: 'Launch win-back campaign for 284 lapsed customers',
    reasoning:
      'High-value customers inactive for 30-60 days with avg. order value of $148 — a drafted 3-step email sequence is ready to send.',
    cta: 'Send win-back sequence',
    read: false,
  },
  {
    id: '4',
    coworker: 'Revenue Intelligence',
    category: 'Analytics',
    urgency: 'insight',
    title: "Double down on organic content — it's driving growth",
    reasoning:
      'Weekend revenue was up 18% with zero paid spend. $24,840 came entirely from organic search — a signal to invest further in content.',
    cta: 'Explore content opportunities',
    read: false,
  },
  {
    id: '5',
    coworker: 'Conversion Optimizer',
    category: 'Marketing',
    urgency: 'opportunity',
    title: 'Upsell opportunity: users viewing plan page 3x',
    reasoning:
      '127 users visited the pricing page 3+ times this week without converting. A targeted nudge or chat trigger could capture them.',
    cta: 'Set up trigger',
    read: true,
  },
  {
    id: '6',
    coworker: 'Revenue Intelligence',
    category: 'Analytics',
    urgency: 'insight',
    title: 'Tuesday traffic peak — reallocate ad budget',
    reasoning:
      'Tuesdays drive 31% more sessions than any other weekday. Current ad spend distribution does not reflect this.',
    cta: 'Review budget allocation',
    read: true,
  },
]

const categoryColors: Record<string, { background: string; color: string }> = {
  'Customer Service': { background: 'hsl(220 25% 96%)', color: 'hsl(220 25% 55%)' },
  Marketing: { background: 'hsl(280 20% 96%)', color: 'hsl(280 20% 56%)' },
  Competitors: { background: 'hsl(35 35% 96%)', color: 'hsl(35 35% 50%)' },
  Analytics: { background: 'hsl(150 20% 96%)', color: 'hsl(150 22% 45%)' },
}

export default function NotificationsClient() {
  const [selected, setSelected] = useState<Notification | null>(null)
  const unread = notifications.filter((n) => !n.read)
  const read = notifications.filter((n) => n.read)

  const renderItem = (n: Notification) => (
    <div
      key={n.id}
      onClick={() => setSelected(n)}
      className="bg-muted/50 hover:bg-muted/70 flex cursor-pointer flex-col rounded-xl p-6 transition-all"
    >
      <div className="flex items-center justify-between">
        <span
          className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-medium"
          style={
            categoryColors[n.category] ?? { background: 'hsl(0 0% 92%)', color: 'hsl(0 0% 48%)' }
          }
        >
          {n.coworker}
        </span>
        {!n.read && <span className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />}
      </div>
      <div className="mt-4">
        <p className="text-foreground text-sm leading-snug font-semibold">{n.title}</p>
        <p className="text-muted-foreground mt-2 text-[12px] leading-relaxed">{n.reasoning}</p>
      </div>
    </div>
  )

  return (
    <div className="bg-background min-h-full px-6 pt-16 pb-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-medium">Notifications</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Actions recommended by your co-workers
            </p>
          </div>
          {unread.length > 0 && (
            <button className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors">
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        {unread.length > 0 && (
          <section className="mb-8">
            <h2 className="text-foreground mb-3 text-lg font-medium">New · {unread.length}</h2>
            <div className="flex flex-col gap-3">{unread.map(renderItem)}</div>
          </section>
        )}

        {read.length > 0 && (
          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium">Earlier</h2>
            <div className="flex flex-col gap-3 opacity-70">{read.map(renderItem)}</div>
          </section>
        )}

        <Sheet
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        >
          <SheetContent side="right" className="flex flex-col p-0">
            {selected && (
              <>
                <div className="border-border flex flex-col gap-2 border-b px-6 pt-6 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={
                        categoryColors[selected.category] ?? {
                          background: 'hsl(0 0% 92%)',
                          color: 'hsl(0 0% 48%)',
                        }
                      }
                    >
                      {selected.category}
                    </span>
                    <span className="text-muted-foreground text-xs">{selected.coworker}</span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-muted-foreground text-xs capitalize">
                      {selected.urgency}
                    </span>
                  </div>
                  <h2 className="text-foreground pr-6 text-base leading-snug font-semibold">
                    {selected.title}
                  </h2>
                </div>
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                  <div>
                    <p className="text-muted-foreground mb-2 text-xs">Why this matters</p>
                    <p className="text-foreground/80 text-sm leading-relaxed">
                      {selected.reasoning}
                    </p>
                  </div>
                  <div className="border-border border-t" />
                  <div>
                    <p className="text-muted-foreground mb-3 text-xs">Suggested action</p>
                    <div className="border-border bg-muted/30 flex items-center justify-between rounded-xl border px-4 py-3">
                      <span className="text-foreground text-sm font-medium">{selected.cta}</span>
                    </div>
                  </div>
                </div>
                <div className="border-border flex gap-2 border-t px-6 py-4">
                  <button className="border-border text-foreground/70 hover:bg-accent/50 flex-1 rounded-lg border bg-transparent py-2 text-[11px] transition-colors">
                    Take action
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="border-border text-muted-foreground hover:bg-accent/50 rounded-lg border px-4 text-[11px] transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
