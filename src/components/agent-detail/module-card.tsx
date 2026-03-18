'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toggleModule } from '@/lib/actions/modules'
import { useQueryClient } from '@tanstack/react-query'
import type { ModuleWithStatus } from '@/lib/modules/types'

const STATUS_CONFIG = {
  active: {
    label: 'Ativo',
    className: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  },
  paused: {
    label: 'Pausado',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  requires_connection: {
    label: 'Conexão necessária',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  error: { label: 'Erro', className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400' },
} as const

/** Human-readable display names for app connection keys */
const APP_DISPLAY_NAMES: Record<string, string> = {
  nuvemshop: 'Nuvemshop',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  gmail: 'Gmail',
  shopify: 'Shopify',
}

function getDisplayName(appKey: string): string {
  return APP_DISPLAY_NAMES[appKey] ?? appKey.charAt(0).toUpperCase() + appKey.slice(1)
}

interface ModuleCardProps {
  module: ModuleWithStatus
  agentId: string
}

export default function ModuleCard({ module, agentId }: ModuleCardProps) {
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      await toggleModule(module.id, checked)
      await queryClient.invalidateQueries({ queryKey: ['agent-modules', agentId] })
    })
  }

  const statusConfig = STATUS_CONFIG[module.status]
  const hasMissingConnections = module.connectionStatuses.some((c) => !c.connected)

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm font-medium">{module.name}</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                statusConfig.className
              )}
            >
              {statusConfig.label}
            </span>
          </div>
          {module.description && (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {module.description}
            </p>
          )}
        </div>

        {/* Toggle */}
        <div className="flex shrink-0 items-center gap-2">
          {isPending && <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />}
          <Switch
            checked={module.enabled}
            onCheckedChange={handleToggle}
            disabled={isPending}
            aria-label={`${module.enabled ? 'Desativar' : 'Ativar'} ${module.name}`}
          />
        </div>
      </div>

      {/* Connections */}
      {module.connectionStatuses.length > 0 && (
        <div className="border-border mt-3 border-t pt-3">
          <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            Integrações
          </p>
          <div className="space-y-1.5">
            {module.connectionStatuses.map((conn) => (
              <div key={conn.appKey} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {conn.connected ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="text-foreground text-xs">{getDisplayName(conn.appKey)}</span>
                </div>
                {!conn.connected && (
                  <Link
                    href="/apps"
                    className="text-[11px] font-medium text-blue-600 transition-colors hover:underline"
                  >
                    Conectar
                  </Link>
                )}
              </div>
            ))}
          </div>

          {hasMissingConnections && (
            <p className="text-muted-foreground mt-2 text-[11px]">
              Conecte as integrações ausentes para ativar este módulo.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
