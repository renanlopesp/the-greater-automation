'use client'

import { useLanguage } from '@/contexts/language-context'

export default function CoworkerRecommendation() {
  const { t } = useLanguage()

  return (
    <div>
      <h2 className="text-foreground mb-4 text-lg font-medium">
        {t('home.coworkerRecommendation.title')}
      </h2>
      <div className="border-border bg-background flex flex-col items-start gap-5 rounded-2xl border p-7 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm">
              {'\u{1F4E3}'}
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-foreground text-sm font-medium">Marketing Agent</p>
              <span className="text-muted-foreground border-border rounded-full border px-2 py-0.5 text-[10px]">
                {t('agent.inactive')}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            Seus clientes ativos têm alto potencial de upsell &mdash; o Marketing Agent identifica
            essas oportunidades e cria campanhas automaticamente. Estimamos R$8.400/mês em receita
            adicional.
          </p>
        </div>
        <button className="bg-foreground text-background hover:bg-foreground/90 h-9 shrink-0 rounded-xl px-4 text-xs font-medium whitespace-nowrap transition-colors">
          {t('home.activateAgent')}
        </button>
      </div>
    </div>
  )
}
