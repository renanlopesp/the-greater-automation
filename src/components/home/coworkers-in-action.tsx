'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { agentCards as staticAgentCards, type AgentCard } from '@/data/home-dashboard'

interface CoworkersInActionProps {
  onSelectAgent: (agent: AgentCard) => void
  agents?: AgentCard[]
}

export default function CoworkersInAction({ onSelectAgent, agents }: CoworkersInActionProps) {
  const { t } = useLanguage()
  const cards = agents ?? staticAgentCards

  return (
    <div>
      <h2 className="text-foreground mb-4 text-lg font-medium">
        {t('home.coworkersInAction.title')}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => onSelectAgent(card)}
            className="group border-border bg-background hover:border-foreground/50 flex cursor-pointer flex-col rounded-2xl border transition-colors"
          >
            <div className="flex flex-1 flex-col gap-3 p-7">
              <div className="flex items-center gap-2.5">
                <div className="bg-muted h-7 w-7 shrink-0 overflow-hidden rounded-full">
                  {card.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.avatarUrl}
                      alt={card.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm">
                      {card.emoji}
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <p className="text-foreground text-sm leading-tight font-medium">{card.name}</p>
                  {card.pulse && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                        style={{ backgroundColor: 'var(--green)' }}
                      />
                      <span
                        className="relative inline-flex h-2 w-2 rounded-full"
                        style={{ backgroundColor: 'var(--green)' }}
                      />
                    </span>
                  )}
                </div>
              </div>

              {card.inactive ? (
                <div className="flex flex-col gap-0.5 text-center">
                  <p className="text-muted-foreground text-[13px] leading-relaxed">{card.stat1}</p>
                  <p className="text-foreground text-xl font-medium">{card.stat2}</p>
                  <p className="text-muted-foreground text-[13px]">{card.stat3}</p>
                </div>
              ) : (
                <p className="text-muted-foreground line-clamp-2 text-[13px] leading-relaxed">
                  {card.summary}
                </p>
              )}

              {!card.inactive && (
                <div className="border-border mt-auto border-t pt-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <p className="text-muted-foreground/60 mb-1 text-[11px]">
                    {t('home.recentResult')}
                  </p>
                  <p className="text-muted-foreground text-[13px]">{card.stat2}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add co-worker card */}
        <Link
          href="/agents"
          className="border-border bg-background hover:border-foreground/30 hover:bg-muted/30 flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-7 transition-colors"
        >
          <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-full">
            <Plus className="text-muted-foreground h-3.5 w-3.5" />
          </div>
          <p className="text-muted-foreground text-sm">{t('home.addCoworker')}</p>
        </Link>
      </div>
    </div>
  )
}
