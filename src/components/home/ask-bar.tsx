'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Mic, ArrowUp } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

interface AskBarProps {
  orchestratorId?: string
}

export default function AskBar({ orchestratorId }: AskBarProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [askValue, setAskValue] = useState('')

  const sendMessage = (message: string) => {
    const trimmed = message.trim()
    if (!trimmed) return
    const target = orchestratorId
      ? `/agents/${orchestratorId}?q=${encodeURIComponent(trimmed)}`
      : `/chat?q=${encodeURIComponent(trimmed)}`
    router.push(target)
  }

  const quickSuggestions = [
    t('home.askBar.atRisk'),
    t('home.askBar.topProducts'),
    t('home.askBar.monthForecast'),
  ]

  return (
    <div className="flex flex-col gap-2.5">
      <div className="border-border bg-muted/40 focus-within:border-foreground/30 focus-within:bg-background overflow-hidden rounded-2xl border transition-all">
        <textarea
          rows={2}
          value={askValue}
          onChange={(e) => setAskValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage(askValue)
            }
          }}
          placeholder={t('home.askBar.placeholder')}
          className="placeholder:text-muted-foreground max-h-32 w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed outline-none"
        />
        <div className="flex items-center justify-between px-3 pt-1 pb-3">
          <button className="text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center transition-colors">
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => sendMessage(askValue)}
            className="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center transition-colors"
          >
            {askValue.trim() ? <ArrowUp className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {quickSuggestions.map((chip) => (
          <button
            key={chip}
            onClick={() => sendMessage(chip)}
            className="border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
