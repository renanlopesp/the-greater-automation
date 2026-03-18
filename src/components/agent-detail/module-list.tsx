'use client'

import { useAgentModules } from '@/hooks/use-agent-modules'
import ModuleCard from './module-card'

interface ModuleListProps {
  agentId: string
}

export default function ModuleList({ agentId }: ModuleListProps) {
  const { data: modules, isLoading, isError } = useAgentModules(agentId)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border-border bg-muted/40 h-32 animate-pulse rounded-xl border" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm text-red-700 dark:text-red-400">
          Erro ao carregar módulos. Tente novamente.
        </p>
      </div>
    )
  }

  if (!modules || modules.length === 0) {
    return (
      <div className="border-border rounded-xl border p-6 text-center">
        <p className="text-muted-foreground text-sm">Nenhum módulo configurado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-sm font-medium">Módulos</h3>
        <span className="text-muted-foreground text-xs">
          {modules.filter((m) => m.status === 'active').length} de {modules.length} ativos
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {modules.map((mod) => (
          <ModuleCard key={mod.id} module={mod} agentId={agentId} />
        ))}
      </div>
    </div>
  )
}
