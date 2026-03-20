'use client'

import type { ConversionListOutput } from '@/lib/modules/output-schemas'

interface ArtifactConversionsProps {
  data: ConversionListOutput
}

export default function ArtifactConversions({ data }: ArtifactConversionsProps) {
  return (
    <div className="space-y-4">
      {/* Conversion rows */}
      <div className="divide-border divide-y">
        {data.conversions.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-xs font-semibold">{item.customer_name}</p>
              <p className="text-muted-foreground truncate text-[10px]">{item.product}</p>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-1.5">
              <span className="text-xs font-semibold">R${item.value.toLocaleString('pt-BR')}</span>
              <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                {item.channel}
              </span>
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                convertido
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="border-border rounded-lg border bg-green-50 px-3 py-2 dark:bg-green-900/10">
        <p className="text-sm font-semibold text-green-700 dark:text-green-400">
          R${data.total_recovered_value.toLocaleString('pt-BR')} recuperados
        </p>
      </div>

      {/* Insight */}
      {data.insight && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-muted-foreground text-xs leading-relaxed">{data.insight}</p>
        </div>
      )}
    </div>
  )
}
