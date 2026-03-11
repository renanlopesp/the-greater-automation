'use client'

import { useState, useMemo } from 'react'
import { Search, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { apps as staticApps, type AppIntegration } from '@/data/apps'
import { cn } from '@/lib/utils'

interface AppsClientProps {
  apps?: AppIntegration[]
}

export default function AppsClient({ apps: appsProp }: AppsClientProps) {
  const { t } = useLanguage()
  const catalog = appsProp ?? staticApps
  const [search, setSearch] = useState('')
  const [appState, setAppState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(catalog.map((a) => [a.id, a.connected]))
  )

  const connectedCount = Object.values(appState).filter(Boolean).length

  const filtered = useMemo(() => {
    if (!search.trim()) return catalog
    const q = search.toLowerCase()
    return catalog.filter((a) => a.name.toLowerCase().includes(q))
  }, [search, catalog])

  const toggleConnect = (id: string) => {
    setAppState((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            {t('apps.title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('apps.subtitle')}{' '}
            <span className="text-foreground font-medium">
              {connectedCount} {t('apps.connected').toLowerCase()}
            </span>
            .
          </p>
        </div>

        {/* Security note */}
        <div className="border-border bg-muted/40 my-5 flex items-start gap-3 rounded-xl border p-4">
          <ShieldCheck className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-muted-foreground text-sm leading-relaxed">{t('apps.securityNote')}</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('apps.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-full border-none py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
          />
        </div>

        {/* Apps grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((app) => {
            const connected = appState[app.id] ?? false
            return (
              <div
                key={app.id}
                className="border-border bg-background hover:border-foreground/30 flex items-center gap-4 rounded-2xl border p-5 transition-colors"
              >
                <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg">
                  {app.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">{app.name}</p>
                  <p className="text-muted-foreground truncate text-xs">{app.description}</p>
                </div>
                <button
                  onClick={() => toggleConnect(app.id)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                    connected
                      ? 'bg-foreground text-background hover:opacity-90'
                      : 'border-border text-foreground hover:bg-muted border'
                  )}
                >
                  {connected ? t('apps.connected') : t('apps.connect')}
                </button>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">No apps found</p>
          </div>
        )}

        <div className="h-10" />
      </div>
    </div>
  )
}
