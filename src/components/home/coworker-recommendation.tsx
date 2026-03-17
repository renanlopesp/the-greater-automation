'use client'

import { useLanguage } from '@/contexts/language-context'
import { useCoworkerAvatars } from '@/hooks/use-coworker-avatars'
import CoworkerAvatar from '@/components/coworker-avatar'
import { FEATURE_FLAGS } from '@/lib/feature-flags'

export default function CoworkerRecommendation() {
  const { t } = useLanguage()
  const { avatars } = useCoworkerAvatars()
  const avatarUrl = avatars['conversion-optimizer']

  if (!FEATURE_FLAGS.MOCK_COWORKER_RECOMMENDATION) return null

  return (
    <div className="relative">
      {process.env.NODE_ENV === 'development' && (
        <span className="absolute top-2 right-2 z-10 rounded bg-amber-100 px-1 text-[9px] font-medium text-amber-700">
          MOCK
        </span>
      )}
      <h2 className="text-foreground mb-4 text-lg font-medium">
        {t('home.coworkerRecommendation.title')}
      </h2>
      <div className="border-border bg-background flex flex-col gap-3 rounded-2xl border p-7">
        <div className="flex items-center gap-2.5">
          <CoworkerAvatar src={avatarUrl} name="Marketing Agent" size="xs" />
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
    </div>
  )
}
