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
    <div className="flex flex-wrap justify-center gap-2">
      {PILLS.map((pill) => (
        <button
          key={pill}
          onClick={() => handleClick(pill)}
          className="transition-colors"
          style={{
            fontSize: 13,
            padding: '6px 16px',
            color: '#6B6760',
            border: '1px solid #E5E3DC',
            borderRadius: 100,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#2C2A25'
            e.currentTarget.style.borderColor = '#C2BFB5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#6B6760'
            e.currentTarget.style.borderColor = '#E5E3DC'
          }}
        >
          {pill}
        </button>
      ))}
    </div>
  )
}
