'use client'

import Avatar from 'boring-avatars'
import { PALETTE_MAP, type PaletteName } from '@/lib/agent-palettes'
import { cn } from '@/lib/utils'

const PALETTE_NAMES = Object.keys(PALETTE_MAP) as PaletteName[]

interface PalettePickerProps {
  value: PaletteName
  onChange: (palette: PaletteName) => void
  agentName: string
}

export default function PalettePicker({ value, onChange, agentName }: PalettePickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {PALETTE_NAMES.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={cn(
            'rounded-full p-0.5 transition-all',
            value === name
              ? 'ring-primary ring-2 ring-offset-2'
              : 'hover:ring-muted-foreground/30 ring-1 ring-transparent hover:ring-offset-1'
          )}
        >
          <Avatar
            size={36}
            name={agentName || 'Agent'}
            variant="bauhaus"
            colors={PALETTE_MAP[name]}
          />
        </button>
      ))}
    </div>
  )
}
