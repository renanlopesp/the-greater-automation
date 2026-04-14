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
      router.push(`/studio/create?autoPrompt=${encodeURIComponent(pill)}`)
    }
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {PILLS.map((pill) => (
        <button
          key={pill}
          onClick={() => handleClick(pill)}
          className="transition-colors"
          style={{
            fontSize: 13,
            padding: '6px 16px',
            color: 'var(--muted-foreground)',
            border: '1px solid var(--border)',
            borderRadius: 100,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--foreground)'
            e.currentTarget.style.borderColor = 'var(--foreground)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--muted-foreground)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          {pill}
        </button>
      ))}
    </div>
  )
}
