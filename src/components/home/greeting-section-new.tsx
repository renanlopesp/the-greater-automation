'use client'

import { FEATURE_FLAGS } from '@/lib/feature-flags'

export default function GreetingSectionNew() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-foreground text-[28px] leading-tight font-medium">
        o que você quer resolver hoje?
      </h1>
      {FEATURE_FLAGS.MOCK_GREETING_STATS && (
        <p className="text-muted-foreground text-sm">3 agentes ativos · última atividade há 2h</p>
      )}
    </div>
  )
}
