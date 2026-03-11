'use client'

import { useState } from 'react'
import { Plus, Mic, ArrowUp } from 'lucide-react'

const quickSuggestions = ['Clientes em risco', 'Top produtos', 'Previsão do mês']

export default function AskBar() {
  const [askValue, setAskValue] = useState('')

  return (
    <div className="flex flex-col gap-2.5">
      <div className="border-border bg-muted/40 focus-within:border-foreground/30 focus-within:bg-background overflow-hidden rounded-2xl border transition-all">
        <textarea
          rows={2}
          value={askValue}
          onChange={(e) => setAskValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) e.preventDefault()
          }}
          placeholder='Pergunte algo sobre sua loja... ex: "quais clientes não compram há 60 dias?"'
          className="placeholder:text-muted-foreground max-h-32 w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed outline-none"
        />
        <div className="flex items-center justify-between px-3 pt-1 pb-3">
          <button className="text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center transition-colors">
            <Plus className="h-4 w-4" />
          </button>
          <button className="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center transition-colors">
            {askValue.trim() ? <ArrowUp className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {quickSuggestions.map((chip) => (
          <button
            key={chip}
            onClick={() => setAskValue(chip)}
            className="border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
