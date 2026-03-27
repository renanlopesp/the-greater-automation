'use client'

import { cn } from '@/lib/utils'
import { useArtifactNav } from '@/components/skill-workspace/artifact-nav-context'

interface CalendarHeroCardProps {
  className?: string
}

export function CalendarHeroCard({ className }: CalendarHeroCardProps) {
  const { push } = useArtifactNav()
  const onClick = () => push('Calendario Sazonal 2026')
  return (
    <div className="flex w-full items-center justify-center py-8">
      <button
        onClick={onClick}
        className={cn(
          'group border-border bg-card flex flex-col gap-4 rounded-2xl border p-7 text-left',
          'w-full max-w-[560px] min-w-[300px]',
          'hover:border-foreground/25 cursor-pointer transition-colors duration-150',
          className
        )}
      >
        {/* Icon area */}
        <div className="flex flex-col gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
            style={{ background: 'var(--muted)' }}
          >
            📅
          </div>
          <p className="text-foreground text-base leading-tight font-medium">
            Calendario Sazonal 2026
          </p>
        </div>

        {/* Stats */}
        <div
          className="flex flex-col gap-2"
          style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
        >
          <p>15 datas mapeadas</p>
          <p>R$ 548k potencial total</p>
          <p>
            Próxima ação:{' '}
            <span style={{ color: 'var(--amber)', fontWeight: 500 }}>Dia das Mães (D-47)</span>
          </p>
        </div>
      </button>
    </div>
  )
}
