'use client'

import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useAgentModules } from '@/hooks/use-agent-modules'

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

/** App emoji/icon placeholder by key */
const APP_EMOJI: Record<string, string> = {
  nuvemshop: '🛒',
  whatsapp: '💬',
  telegram: '✈️',
  gmail: '📧',
  shopify: '🛍️',
}

function getEmoji(appKey: string): string {
  return APP_EMOJI[appKey] ?? '🔌'
}

interface AgentConnectionsTabProps {
  agentId: string
}

export default function AgentConnectionsTab({ agentId }: AgentConnectionsTabProps) {
  const { data: modules, isLoading } = useAgentModules(agentId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border-border bg-muted/40 h-14 animate-pulse rounded-xl border" />
        ))}
      </div>
    )
  }

  // Deduplicate connections across all modules
  const connectionMap = new Map<
    string,
    { appKey: string; connected: boolean; lastSyncAt: string | null; usedByModules: string[] }
  >()

  for (const mod of modules ?? []) {
    for (const conn of mod.connectionStatuses) {
      const existing = connectionMap.get(conn.appKey)
      if (existing) {
        existing.usedByModules.push(mod.name)
        // If any module has it connected, mark connected
        if (conn.connected) existing.connected = true
      } else {
        connectionMap.set(conn.appKey, {
          appKey: conn.appKey,
          connected: conn.connected,
          lastSyncAt: conn.lastSyncAt,
          usedByModules: [mod.name],
        })
      }
    }
  }

  const connections = Array.from(connectionMap.values())

  if (connections.length === 0) {
    return (
      <div className="border-border rounded-xl border p-8 text-center">
        <p className="text-muted-foreground text-sm">Nenhuma integração necessária.</p>
      </div>
    )
  }

  const connectedCount = connections.filter((c) => c.connected).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-sm font-medium">Integrações</h3>
        <span className="text-muted-foreground text-xs">
          {connectedCount} de {connections.length} conectadas
        </span>
      </div>

      <div className="space-y-2">
        {connections.map((conn) => (
          <div
            key={conn.appKey}
            className="border-border flex items-center justify-between rounded-xl border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-base" role="img" aria-label={getDisplayName(conn.appKey)}>
                {getEmoji(conn.appKey)}
              </span>
              <div>
                <p className="text-foreground text-sm font-medium">{getDisplayName(conn.appKey)}</p>
                <p className="text-muted-foreground text-[11px]">{conn.usedByModules.join(', ')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {conn.connected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                    Conectado
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="text-muted-foreground h-4 w-4" />
                  <Link
                    href="/workspace?settings=store"
                    className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400"
                  >
                    Reconectar
                  </Link>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
