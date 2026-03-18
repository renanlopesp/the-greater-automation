'use client'

import { cn } from '@/lib/utils'
import type { CartTableOutput } from '@/lib/modules/output-schemas'

interface ArtifactCartTableProps {
  data: CartTableOutput
}

const STATUS_STYLES: Record<string, string> = {
  enviado: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  convertido: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  aguardando: 'bg-muted text-muted-foreground',
}

export default function ArtifactCartTable({ data }: ArtifactCartTableProps) {
  return (
    <div className="space-y-3">
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted-foreground pb-2 text-left font-medium">Cliente</th>
              <th className="text-muted-foreground pb-2 text-left font-medium">Produto</th>
              <th className="text-muted-foreground pb-2 text-right font-medium">Valor</th>
              <th className="text-muted-foreground pb-2 text-right font-medium">Abandonado</th>
              <th className="text-muted-foreground pb-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {data.carts.map((cart, i) => (
              <tr key={i}>
                <td className="py-2 font-medium">{cart.customer_name}</td>
                <td className="text-muted-foreground max-w-[120px] truncate py-2">
                  {cart.product}
                </td>
                <td className="py-2 text-right">R${cart.value.toLocaleString('pt-BR')}</td>
                <td className="text-muted-foreground py-2 text-right">{cart.abandoned_ago}</td>
                <td className="py-2 text-right">
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                      STATUS_STYLES[cart.status] ?? STATUS_STYLES.aguardando
                    )}
                  >
                    {cart.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
