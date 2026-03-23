'use client'

import { useRouter } from 'next/navigation'

const PILLS = [
  'Quais são as melhores oportunidades sazonais?',
  'Mostrar o briefing desta semana',
  'Quais skills devo ativar?',
] as const

interface QuickSuggestionsProps {
  onSelect?: (text: string) => void
}

export default function QuickSuggestions({ onSelect }: QuickSuggestionsProps) {
  const router = useRouter()

  const handleClick = (pill: string) => {
    if (onSelect) {
      onSelect(pill)
    } else {
      router.push(`/chat?q=${encodeURIComponent(pill)}`)
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {PILLS.map((pill) => (
        <button
          key={pill}
          onClick={() => handleClick(pill)}
          className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 rounded-full border px-3.5 py-1.5 transition-colors"
          style={{ fontSize: 12 }}
        >
          {pill}
        </button>
      ))}
    </div>
  )
}
