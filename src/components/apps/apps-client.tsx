'use client'

import { useMemo, useState } from 'react'
import { Search, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AppItem {
  id: string
  name: string
  logoUrl: string
  category: string
  isConnected: boolean
}

interface AppsClientProps {
  apps: AppItem[]
  onConnect?: (appId: string) => void
}

export default function AppsClient({ apps, onConnect }: AppsClientProps) {
  const [search, setSearch] = useState('')

  const connectedCount = apps.filter((a) => a.isConnected).length

  const filtered = useMemo(() => {
    if (!search.trim()) return apps
    const q = search.toLowerCase()
    return apps.filter((a) => a.name.toLowerCase().includes(q))
  }, [apps, search])

  return (
    <div className="mx-auto max-w-3xl px-6 pt-16 pb-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
        <Badge variant="secondary" className="text-xs">
          {connectedCount} connected
        </Badge>
      </div>

      <div className="bg-accent/50 mb-6 flex items-start gap-3 rounded-xl border p-4">
        <ShieldCheck className="text-muted-foreground mt-0.5 size-5 shrink-0" />
        <p className="text-muted-foreground text-sm">
          Your app connections are secure and encrypted. We only request the minimum permissions
          needed.
        </p>
      </div>

      <div className="relative mb-8">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search apps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-muted rounded-full pl-9"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((app) => (
          <div
            key={app.id}
            className="hover:bg-accent flex items-center gap-3 rounded-xl border p-4 transition-colors"
          >
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg">
              {app.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={app.logoUrl} alt={app.name} className="h-6 w-6 rounded object-contain" />
              ) : (
                getAppEmoji(app.name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{app.name}</p>
              <p className="text-muted-foreground text-xs">{app.category}</p>
            </div>
            {app.isConnected ? (
              <Badge variant="secondary" className="text-xs">
                Connected
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => onConnect?.(app.id)}
              >
                Connect
              </Button>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">No apps found</p>
        </div>
      )}
    </div>
  )
}

function getAppEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('slack')) return '💬'
  if (n.includes('gmail') || n.includes('email')) return '📧'
  if (n.includes('calendar')) return '📅'
  if (n.includes('drive') || n.includes('storage')) return '📁'
  if (n.includes('sheet')) return '📊'
  if (n.includes('github')) return '🐙'
  if (n.includes('notion')) return '📝'
  if (n.includes('stripe')) return '💳'
  if (n.includes('shop') || n.includes('store')) return '🛒'
  if (n.includes('telegram')) return '✈️'
  if (n.includes('whatsapp')) return '📱'
  return '🔗'
}
