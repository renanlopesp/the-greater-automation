interface RevenueProjectionProps {
  current: number
  projected: number
  delta: number
  disclaimer: string
}

function formatBRL(value: number): string {
  const k = Math.round(value / 1000)
  return `R$ ${k}k/ano`
}

function formatDeltaBRL(value: number): string {
  const k = Math.round(value / 1000)
  return `+R$ ${k}k`
}

export function RevenueProjection({
  current,
  projected,
  delta,
  disclaimer,
}: RevenueProjectionProps) {
  return (
    <div className="mb-6">
      <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
        O que eu projeto
      </span>
      <p
        className="text-muted-foreground mb-1.5 text-[14px] leading-relaxed"
        style={{ lineHeight: 1.6 }}
      >
        Hoje vocês faturam estimados{' '}
        <strong className="text-foreground">{formatBRL(current)}</strong> em datas sazonais. Com o
        Snew, projeto <strong className="text-foreground">{formatBRL(projected)}</strong> — um
        incremento de{' '}
        <strong style={{ color: 'hsl(var(--green))' }}>{formatDeltaBRL(delta)}</strong> vindo de
        datas que vocês ainda não estão aproveitando.
      </p>
      <p className="text-muted-foreground text-[12px]">{disclaimer}</p>
    </div>
  )
}
