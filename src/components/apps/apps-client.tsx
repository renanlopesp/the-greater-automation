'use client'

import { useState, useMemo, useTransition } from 'react'
import { Search, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react'
import { type AppIntegration } from '@/data/apps'
import { initiateAppConnection } from '@/lib/composio/actions/initiate-connection'
import { cn } from '@/lib/utils'

interface AppsClientProps {
  apps: AppIntegration[]
}

export default function AppsClient({ apps }: AppsClientProps) {
  const [search, setSearch] = useState('')
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const connectedCount = apps.filter((a) => a.connected).length

  const filtered = useMemo(() => {
    if (!search.trim()) return apps
    const q = search.toLowerCase()
    return apps.filter((a) => a.name.toLowerCase().includes(q))
  }, [search, apps])

  const handleConnect = (app: AppIntegration) => {
    if (app.connected) return

    setConnectingId(app.id)

    if (app.isNative && app.id === 'nuvemshop') {
      window.location.assign('/api/nuvemshop/connect')
      return
    }

    startTransition(async () => {
      try {
        const result = await initiateAppConnection(app.id)
        if ('redirectUrl' in result) {
          window.location.href = result.redirectUrl
        } else {
          console.error('Connect error:', result.error)
          setConnectingId(null)
        }
      } catch {
        setConnectingId(null)
      }
    })
  }

  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 pt-16 pb-6">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-foreground text-2xl font-medium">Apps</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Connect your tools so co-workers can act on your data.{' '}
            <span className="text-foreground font-bold">{connectedCount} connected</span>.
          </p>
        </div>

        {/* Security note */}
        <div className="border-border mb-5 flex items-start gap-3 rounded-lg border px-4 py-3">
          <ShieldCheck className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-muted-foreground text-sm leading-relaxed">
            Credentials are encrypted and tokens are automatically refreshed — we never store your
            passwords.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="text-muted-foreground absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted text-foreground placeholder:text-muted-foreground w-full rounded-2xl border-none px-4 py-3 pl-10 text-sm focus:outline-none"
          />
        </div>

        {/* Apps grid */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((app) => {
            const isConnecting = connectingId === app.id && (isPending || app.isNative)
            return (
              <div
                key={app.id}
                className="group border-border bg-background flex items-center gap-3 rounded-2xl border p-4"
              >
                {app.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={app.logoUrl}
                    alt={app.name}
                    className="h-8 w-8 shrink-0 rounded-lg object-contain"
                  />
                ) : app.emoji ? (
                  <span className="text-2xl leading-none">{app.emoji}</span>
                ) : (
                  <span className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium">
                    {app.name.charAt(0)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">{app.name}</p>
                </div>
                <div className="shrink-0">
                  {app.connected ? (
                    <div className="relative flex items-center">
                      <span className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2.5 py-1 text-xs group-hover:hidden">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </span>
                      <button className="text-muted-foreground hover:text-foreground hidden rounded-full border border-red-200 px-2.5 py-1 text-xs group-hover:flex">
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(app)}
                      disabled={isConnecting}
                      className={cn(
                        'border-border text-foreground rounded-full border px-2.5 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100',
                        isConnecting && 'opacity-70'
                      )}
                    >
                      {isConnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">No apps found</p>
          </div>
        )}
      </div>
    </div>
  )
}
