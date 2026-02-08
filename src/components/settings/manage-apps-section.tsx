'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import AppIntegrationRow from '@/components/settings/app-integration-row'
import { APP_INTEGRATIONS } from '@/lib/data/app-integrations'

export default function ManageAppsSection() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return APP_INTEGRATIONS
    const lower = query.toLowerCase()
    return APP_INTEGRATIONS.filter((app) => app.name.toLowerCase().includes(lower))
  }, [query])

  function handleConnect(appId: string) {
    toast(`Connection flow for ${appId} coming soon`)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold">Manage apps</h2>
      <Input
        placeholder="Search apps..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No apps found matching your search.
          </p>
        ) : (
          filtered.map((app) => (
            <AppIntegrationRow key={app.id} app={app} onConnect={handleConnect} />
          ))
        )}
      </ScrollArea>
    </div>
  )
}
