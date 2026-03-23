import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface SkillCardNewProps {
  slug: string
  name: string
  description: string
  emoji: string
  status: 'active' | 'inactive' | string
  colorBg: string
}

export default function SkillCardNew({
  slug,
  name,
  description,
  emoji,
  status,
  colorBg,
}: SkillCardNewProps) {
  const isActive = status === 'active'

  return (
    <Link href={`/skills/${slug}`}>
      <div
        className={cn(
          'group flex flex-col rounded-2xl border p-5 transition-colors',
          'border-border bg-background hover:border-foreground/25 cursor-pointer'
        )}
        style={{ minHeight: 160 }}
      >
        {/* Top row: icon + active badge */}
        <div className="mb-3 flex items-start justify-between">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
            style={{ background: colorBg }}
          >
            {emoji}
          </div>
          {isActive && (
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                background: 'var(--green-bg)',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--green)',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--green)' }} />
              Active
            </span>
          )}
        </div>

        {/* Name */}
        <p className="text-foreground mb-1.5 text-sm leading-snug font-medium">{name}</p>

        {/* Description — pushes to bottom */}
        <p
          className="text-muted-foreground mt-auto line-clamp-2"
          style={{ fontSize: 13, lineHeight: 1.5 }}
        >
          {description}
        </p>
      </div>
    </Link>
  )
}
