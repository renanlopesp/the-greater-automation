'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, Circle, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getAgentTypeDefinition } from '@/lib/modules/registry'
import { createBrowserClient } from '@supabase/ssr'

type ConnectionStatus = 'pending' | 'verifying' | 'connected' | 'missing'

interface ConnectionState {
  appKey: string
  displayName: string
  status: ConnectionStatus
}

interface ConnectionTourProps {
  agentType: string
  teamId: string
  onComplete: () => void
  onSkip: () => void
}

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

/** Check if a nuvemshop store connection exists for the team via Supabase directly */
async function checkNuvemshopConnection(teamId: string): Promise<boolean> {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('stores')
      .select('id')
      .eq('team_id', teamId)
      .eq('platform', 'nuvemshop')
      .not('platform_access_token', 'is', null)
      .limit(1)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

/** Check if an app_connection exists for the team */
async function checkComposioConnection(teamId: string, appKey: string): Promise<boolean> {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('app_connections')
      .select('id')
      .eq('team_id', teamId)
      .eq('app_id', appKey)
      .limit(1)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

async function checkConnection(teamId: string, appKey: string): Promise<boolean> {
  if (appKey === 'nuvemshop') {
    return checkNuvemshopConnection(teamId)
  }
  return checkComposioConnection(teamId, appKey)
}

export default function ConnectionTour({
  agentType,
  teamId,
  onComplete,
  onSkip,
}: ConnectionTourProps) {
  const definition = getAgentTypeDefinition(agentType)
  const [connections, setConnections] = useState<ConnectionState[]>([])
  const [isVerifying, setIsVerifying] = useState(false)
  const [allConnected, setAllConnected] = useState(false)

  // Collect unique required connections across all modules
  const requiredConnections = useMemo(
    () =>
      definition
        ? Array.from(new Set(definition.modules.flatMap((m) => m.requiredConnections)))
        : [],
    [definition]
  )

  // Initialize connection states
  useEffect(() => {
    setConnections(
      requiredConnections.map((appKey) => ({
        appKey,
        displayName: getDisplayName(appKey),
        status: 'pending' as ConnectionStatus,
      }))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentType])

  const verifyAll = useCallback(async () => {
    if (requiredConnections.length === 0) {
      setAllConnected(true)
      return
    }

    setIsVerifying(true)

    // Set all to verifying
    setConnections((prev) => prev.map((c) => ({ ...c, status: 'verifying' })))

    // Check each connection with a small stagger for UX
    for (let i = 0; i < requiredConnections.length; i++) {
      const appKey = requiredConnections[i]
      await new Promise((resolve) => setTimeout(resolve, 400 * i))
      const connected = await checkConnection(teamId, appKey)
      setConnections((prev) =>
        prev.map((c) =>
          c.appKey === appKey ? { ...c, status: connected ? 'connected' : 'missing' } : c
        )
      )
    }

    setIsVerifying(false)
  }, [teamId, requiredConnections])

  // Check allConnected after connections update
  useEffect(() => {
    if (connections.length > 0 && connections.every((c) => c.status === 'connected')) {
      setAllConnected(true)
    } else {
      setAllConnected(false)
    }
  }, [connections])

  // Auto-verify on mount
  useEffect(() => {
    if (requiredConnections.length > 0) {
      verifyAll()
    } else {
      setAllConnected(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onSkip])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!definition) return null

  const connectedCount = connections.filter((c) => c.status === 'connected').length
  const totalCount = connections.length

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className="bg-background border-border relative w-full max-w-md rounded-2xl border shadow-2xl"
        style={{ animation: 'tourSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Close / skip button */}
        <button
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-4 right-4 rounded-lg p-1.5 transition-colors"
          aria-label="Pular"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-8 pt-8 pb-7">
          <h2 className="text-foreground text-base font-semibold">Verificar conexões</h2>
          <p className="text-muted-foreground mt-1 text-[13px]">
            {definition.name} precisa das seguintes integrações para funcionar.
          </p>

          {/* Progress */}
          {totalCount > 0 && (
            <p className="text-muted-foreground mt-4 text-xs">
              {connectedCount} de {totalCount} verificadas
            </p>
          )}

          {/* Connection list */}
          <div className="mt-4 space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.appKey}
                className="border-border flex items-center justify-between rounded-xl border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {conn.status === 'verifying' ? (
                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                  ) : conn.status === 'connected' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : conn.status === 'missing' ? (
                    <Circle className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <Circle className="text-muted-foreground/40 h-4 w-4" />
                  )}
                  <span className="text-foreground text-sm font-medium">{conn.displayName}</span>
                </div>

                {conn.status === 'connected' && (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                    Conectado
                  </span>
                )}

                {conn.status === 'missing' && (
                  <Link
                    href="/apps"
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950"
                  >
                    Conectar
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}

                {conn.status === 'pending' && (
                  <span className="text-muted-foreground text-[11px]">Aguardando</span>
                )}

                {conn.status === 'verifying' && (
                  <span className="text-muted-foreground text-[11px]">Verificando...</span>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2">
            {allConnected ? (
              <button
                className="bg-foreground text-background w-full rounded-2xl py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                onClick={onComplete}
              >
                Continuar
              </button>
            ) : (
              <>
                <button
                  className="bg-foreground text-background flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                  onClick={verifyAll}
                  disabled={isVerifying}
                >
                  {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isVerifying ? 'Verificando...' : 'Reverificar conexões'}
                </button>
                <button
                  className="text-muted-foreground hover:text-foreground w-full py-2 text-[13px] transition-colors"
                  onClick={onSkip}
                >
                  Pular por agora
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tourSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )

  return createPortal(modal, document.body)
}
