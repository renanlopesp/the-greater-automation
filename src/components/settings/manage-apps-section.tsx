'use client'

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import AppIntegrationRow from '@/components/settings/app-integration-row'
import { APP_INTEGRATIONS } from '@/lib/data/app-integrations'

interface Connection {
  id: string
  app_id: string
  account_label: string
  created_at: string
}

const CONNECTABLE_APP_IDS = ['github', 'slack', 'notion', 'linkedin', 'discord']

export default function ManageAppsSection() {
  const [query, setQuery] = useState('')
  const [connections, setConnections] = useState<Connection[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchConnections() {
      try {
        const response = await fetch('/api/auth/connections')
        if (!response.ok) throw new Error('Failed to fetch connections')
        const data = await response.json()
        setConnections(data.connections || [])
      } catch (error) {
        console.error('Error fetching connections:', error)
        toast.error('Failed to load connections')
      } finally {
        setIsLoading(false)
      }
    }

    fetchConnections()
  }, [])

  const connectableApps = useMemo(() => {
    return APP_INTEGRATIONS.filter((app) => CONNECTABLE_APP_IDS.includes(app.id))
  }, [])

  const comingSoonApps = useMemo(() => {
    return APP_INTEGRATIONS.filter((app) => !CONNECTABLE_APP_IDS.includes(app.id))
      .slice(0, 10)
      .map((app) => app.name)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return connectableApps
    const lower = query.toLowerCase()
    return connectableApps.filter((app) => app.name.toLowerCase().includes(lower))
  }, [query, connectableApps])

  function handleConnect(appId: string) {
    window.location.href = `/api/auth/${appId}/connect`
  }

  async function handleDisconnect(appId: string) {
    try {
      const response = await fetch(`/api/auth/${appId}/disconnect`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to disconnect')

      setConnections((prev) => prev.filter((conn) => conn.app_id !== appId))
      toast.success('App disconnected successfully')
    } catch (error) {
      console.error('Error disconnecting app:', error)
      toast.error('Failed to disconnect app')
    }
  }

  function getConnectionForApp(appId: string): Connection | undefined {
    return connections.find((conn) => conn.app_id === appId)
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
        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Loading connections...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No apps found matching your search.
          </p>
        ) : (
          <>
            {filtered.map((app) => {
              const connection = getConnectionForApp(app.id)
              return (
                <AppIntegrationRow
                  key={app.id}
                  app={app}
                  isConnected={!!connection}
                  accountLabel={connection?.account_label}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                />
              )
            })}
            {!query.trim() && (
              <div className="mt-8 px-4 pb-4">
                <h3 className="text-muted-foreground mb-2 text-sm font-medium">
                  More integrations coming soon
                </h3>
                <p className="text-muted-foreground text-xs">
                  {comingSoonApps.join(', ')}, and many more...
                </p>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  )
}
