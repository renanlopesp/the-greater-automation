import type { ProductTag } from '@/data/campaign-data'
import { productTagConfig } from '@/data/campaign-data'

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

export type DateStatus = 'done' | 'active' | 'ready' | 'pending' | 'past' | 'upcoming' | 'generated'

export function statusConfig(status: DateStatus): {
  label: string
  bg: string
  color: string
} {
  switch (status) {
    case 'done':
    case 'past':
      return {
        label: status === 'past' ? 'Passado' : 'Concluído',
        bg: 'var(--muted)',
        color: 'var(--muted-foreground)',
      }
    case 'active':
    case 'generated':
      return {
        label: status === 'generated' ? 'Gerado' : 'Ativo',
        bg: 'var(--green-bg)',
        color: 'var(--green)',
      }
    case 'ready':
    case 'upcoming':
      return {
        label: status === 'upcoming' ? 'Próximo' : 'Pronto',
        bg: 'var(--green-bg)',
        color: 'var(--green)',
      }
    case 'pending':
      return {
        label: 'Pendente',
        bg: 'var(--amber-bg)',
        color: 'var(--amber)',
      }
  }
}

export function StatusBadge({ status }: { status: DateStatus }) {
  const config = statusConfig(status)
  return (
    <span
      className="rounded-full px-2.5 py-0.5"
      style={{ fontSize: 11, fontWeight: 500, background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ProductThumb
// ---------------------------------------------------------------------------

export function ProductThumb({ gradient }: { gradient?: string }) {
  return (
    <div
      className="bg-muted h-10 w-10 flex-shrink-0 rounded-lg"
      style={{
        background: gradient ?? undefined,
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// ProductTagBadge
// ---------------------------------------------------------------------------

export function ProductTagBadge({ tag }: { tag: ProductTag }) {
  const config = productTagConfig(tag)
  return (
    <span
      className="rounded-full px-2 py-0.5"
      style={{ fontSize: 11, fontWeight: 500, background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}
