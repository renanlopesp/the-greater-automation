'use client'

import { Network } from 'lucide-react'

export function GraphEmptyState() {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center gap-3">
      <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
        <Network className="text-muted-foreground h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">Nenhum item para visualizar</p>
        <p className="text-muted-foreground text-sm">
          Crie automações e agentes para visualizá-los como um grafo de rede.
        </p>
      </div>
    </div>
  )
}
