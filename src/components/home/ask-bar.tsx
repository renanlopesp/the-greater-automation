'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp } from 'lucide-react'

interface AskBarProps {
  orchestratorId?: string
}

const quickSuggestions = [
  'Quais carrinhos têm maior chance de conversão?',
  'Aprovar sequência WhatsApp de recuperação',
  'Quais clientes estão em risco de churn?',
]

export default function AskBar({ orchestratorId }: AskBarProps) {
  const router = useRouter()
  const [askValue, setAskValue] = useState('')

  const sendMessage = (message: string) => {
    const trimmed = message.trim()
    if (!trimmed) return
    const target = `/studio/create?autoPrompt=${encodeURIComponent(trimmed)}`
    router.push(target)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="border-border bg-muted/40 focus-within:border-foreground/30 focus-within:bg-background overflow-hidden rounded-2xl border shadow-sm transition-all">
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
          placeholder='Pergunte algo sobre sua loja… ex: "quais clientes não compram há 60 dias?"'
          className="placeholder:text-muted-foreground max-h-32 w-full resize-none rounded-t-2xl bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed outline-none"
        />
        <div className="flex items-center justify-end px-3 pt-1 pb-3">
          <button
            onClick={() => sendMessage(askValue)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all ${
              askValue.trim()
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-foreground/40 hover:border-foreground/40 hover:text-foreground/60'
            }`}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
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
