'use client'

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import AppIntegrationRow from '@/components/settings/app-integration-row'
import { APP_INTEGRATIONS } from '@/lib/data/app-integrations'
import type { AppIntegration } from '@/lib/data/app-integrations'
import { getAvailableApps } from '@/lib/composio/actions'

interface Connection {
  id: string
  app_id: string
  account_label: string
  created_at: string
}

export default function ManageAppsSection() {
  const [query, setQuery] = useState('')
  const [connections, setConnections] = useState<Connection[]>([])
  const [availableAppIds, setAvailableAppIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [connectionsRes, apps] = await Promise.all([
          fetch('/api/apps/connections').then((r) => (r.ok ? r.json() : { connections: [] })),
          getAvailableApps(),
        ])
        setConnections(connectionsRes.connections || [])
        setAvailableAppIds(apps.map((a) => a.id))
      } catch {
        setConnections([])
        setAvailableAppIds([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const connectableApps = useMemo(() => {
    return APP_INTEGRATIONS.filter((app) => availableAppIds.includes(app.id))
  }, [availableAppIds])

  // For apps not in Composio, build a simple AppIntegration from connected accounts
  // (in case a connection exists but integration was removed)
  const allApps = useMemo((): AppIntegration[] => {
    const knownIds = new Set(connectableApps.map((a) => a.id))
    const fromConnections = connections
      .filter((c) => !knownIds.has(c.app_id))
      .map((c): AppIntegration | undefined => APP_INTEGRATIONS.find((a) => a.id === c.app_id))
      .filter((a): a is AppIntegration => !!a)
    return [...connectableApps, ...fromConnections]
  }, [connectableApps, connections])

  const filtered = useMemo(() => {
    if (!query.trim()) return allApps
    const lower = query.toLowerCase()
    return allApps.filter((app) => app.name.toLowerCase().includes(lower))
  }, [query, allApps])

  async function handleConnect(appId: string) {
    try {
      const response = await fetch('/api/apps/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId }),
      })

      if (!response.ok) throw new Error('Failed to initiate connection')

      const data = await response.json()
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    } catch (error) {
      console.error('Error connecting app:', error)
      toast.error('Failed to connect app')
    }
  }

  async function handleDisconnect(appId: string) {
    try {
      const response = await fetch('/api/apps/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId }),
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
          <p className="text-muted-foreground py-8 text-center text-sm">Loading apps...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {query.trim()
              ? 'No apps found matching your search.'
              : 'No app integrations configured yet.'}
          </p>
        ) : (
          filtered.map((app) => {
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
          })
        )}
      </ScrollArea>
    </div>
  )
}
