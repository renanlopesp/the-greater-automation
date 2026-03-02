'use client'

import { cn } from '@/lib/utils'
import { SEGMENTS, SEGMENT_LABELS, type Segment } from '@/lib/retail/segment-skills'

interface SegmentStepProps {
  value: Segment | null
  onChange: (value: Segment) => void
}

const SEGMENT_ICONS: Record<Segment, string> = {
  roupas: '👕',
  eletronicos: '📱',
  alimentos: '🍎',
  cosmeticos: '💄',
  casa_decoracao: '🏠',
  esportes: '⚽',
  pet: '🐾',
  outros: '📦',
}

export function SegmentStep({ value, onChange }: SegmentStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Qual o segmento da sua loja?</h2>
        <p className="text-muted-foreground">Isso ajuda a personalizar seus agentes e alertas.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SEGMENTS.map((segment) => (
          <button
            key={segment}
            type="button"
            onClick={() => onChange(segment)}
            className={cn(
              'hover:bg-accent flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
              value === segment && 'border-primary bg-accent'
            )}
          >
            <span className="text-2xl">{SEGMENT_ICONS[segment]}</span>
            <span className="text-sm font-medium">{SEGMENT_LABELS[segment]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
