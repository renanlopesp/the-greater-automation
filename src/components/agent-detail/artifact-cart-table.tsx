'use client'

import { cn } from '@/lib/utils'
import type { CartTableOutput } from '@/lib/modules/output-schemas'

interface ArtifactCartTableProps {
  data: CartTableOutput
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  enviado: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  convertido: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  aguardando: {
    bg: 'bg-muted/50',
    text: 'bg-muted text-muted-foreground',
  },
}

export default function ArtifactCartTable({ data }: ArtifactCartTableProps) {
  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex gap-4 text-xs">
        <span className="text-muted-foreground">
          <span className="text-foreground font-semibold">{data.total_detected}</span> detectados
        </span>
        <span className="text-muted-foreground">
          <span className="text-foreground font-semibold">{data.total_recovered}</span> recuperados
        </span>
        <span className="text-muted-foreground">
          <span className="text-foreground font-semibold">
            R${data.total_value_at_risk.toLocaleString('pt-BR')}
          </span>{' '}
          em risco
        </span>
      </div>

      {/* Cart cards */}
      {data.carts.length > 0 ? (
        <div className="space-y-3">
          {data.carts.map((cart, i) => {
            const styles = STATUS_STYLES[cart.status] ?? STATUS_STYLES.aguardando
            return (
              <div key={i} className={cn('border-border rounded-xl border p-4', styles.bg)}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-foreground text-sm font-medium">{cart.customer_name}</p>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                      styles.text
                    )}
                  >
                    {cart.status}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-foreground/70 text-xs">
                    <span className="text-foreground/50">Produto:</span> {cart.product}
                  </p>
                  <p className="text-foreground/70 text-xs">
                    <span className="text-foreground/50">Valor:</span> R$
                    {cart.value.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-foreground/70 text-xs">
                    <span className="text-foreground/50">Abandonado há:</span> {cart.abandoned_ago}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-muted-foreground py-4 text-center text-xs">
          Nenhum carrinho abandonado detectado neste ciclo.
        </p>
      )}
    </div>
  )
}
