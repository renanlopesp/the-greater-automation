'use client'

import { useLanguage } from '@/contexts/language-context'
import { opportunities } from '@/data/home-dashboard'

export default function OpportunitiesSection() {
  const { t } = useLanguage()

  return (
    <div>
      <h2 className="text-foreground mb-4 text-lg font-medium">{t('home.opportunities.title')}</h2>
      <div className="border-border bg-background divide-border divide-y overflow-hidden rounded-2xl border">
        {opportunities.map((opp) => (
          <div
            key={opp.agent}
            className="hover:bg-muted/40 flex items-start gap-4 p-5 transition-colors"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm">
                  {opp.emoji}
                </div>
                <p className="text-foreground text-sm font-medium">{opp.agent}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-muted-foreground text-[13px] leading-relaxed">{opp.summary}</p>
                <span className="text-foreground text-xs font-medium">{opp.value}</span>
              </div>
            </div>
            <button className="bg-foreground text-background hover:bg-foreground/90 h-8 shrink-0 self-center rounded-xl px-3 text-xs font-medium whitespace-nowrap transition-colors">
              {opp.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
