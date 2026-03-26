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
          'group border-border bg-card flex flex-col gap-4 rounded-2xl border p-6 text-left',
          'w-full max-w-[500px] min-w-[300px]',
          'hover:border-foreground/25 cursor-pointer transition-colors duration-150',
          className
        )}
      >
        {/* Icon area */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
              style={{ background: 'var(--muted)' }}
            >
              📅
            </div>
            {/* Date badge */}
            <div
              className="absolute -right-1 -bottom-1 rounded-md px-1.5 py-0.5 text-[10px] leading-tight font-semibold"
              style={{
                background: 'var(--amber)',
                color: '#fff',
              }}
            >
              Jul 17
            </div>
          </div>

          <div>
            <p className="text-foreground text-base leading-tight font-semibold">
              Calendario Sazonal 2026
            </p>
          </div>
        </div>

        {/* Stats */}
        <div
          className="flex flex-col gap-1.5"
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
