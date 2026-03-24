'use client'

import { useState } from 'react'
import { Search, ShieldCheck } from 'lucide-react'
import { appCatalog } from '@/data/apps'
import AppCard from '@/components/apps/app-card'

export default function AppsGrid() {
  const [search, setSearch] = useState('')

  const filtered = appCatalog.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-background min-h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 pt-16 pb-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-foreground text-2xl font-medium">Apps</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Connect your tools so co-workers can act on your data.
          </p>
        </div>

        {/* Security notice */}
        <div className="border-border bg-background mb-5 flex items-start gap-3 rounded-lg border px-4 py-3">
          <ShieldCheck className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-muted-foreground text-xs leading-relaxed">
            Credentials are encrypted and tokens are automatically refreshed — we never store your
            passwords.
          </p>
        </div>

        {/* Search */}
        <div className="bg-muted mb-4 flex items-center gap-2 rounded-2xl px-4 py-3">
          <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <input
            type="text"
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {/* App list */}
        <div className="flex flex-col gap-2">
          {filtered.map((app) => (
            <AppCard key={app.slug} app={app} />
          ))}

          {filtered.length === 0 && (
            <p className="text-muted-foreground py-10 text-center text-sm">No apps found</p>
          )}
        </div>
      </div>
    </div>
  )
}
