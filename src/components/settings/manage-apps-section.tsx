'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import AppIntegrationRow from '@/components/settings/app-integration-row'
import { APP_INTEGRATIONS } from '@/lib/data/app-integrations'
import type { AppIntegration } from '@/lib/data/app-integrations'
import { useAppConnections } from '@/hooks/use-app-connections'
import { initiateAppConnection, disconnectApp } from '@/lib/composio/actions'

export default function ManageAppsSection() {
  const [query, setQuery] = useState('')
  const { data, isLoading } = useAppConnections()
  const queryClient = useQueryClient()

  const connections = useMemo(() => data?.connections ?? [], [data?.connections])
  const availableApps = useMemo(() => data?.availableApps ?? [], [data?.availableApps])

  const integrationMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const app of availableApps) {
      map[app.id] = app.integrationId
    }
    return map
  }, [availableApps])

  const connectableApps = useMemo(() => {
    const ids = new Set(availableApps.map((a) => a.id))
    return APP_INTEGRATIONS.filter((app) => ids.has(app.id))
  }, [availableApps])

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
    const result = await initiateAppConnection(appId, integrationMap[appId])

    if ('error' in result) {
      toast.error(result.error)
      return
    }

    window.location.href = result.redirectUrl
  }

  async function handleDisconnect(appId: string) {
    const result = await disconnectApp(appId)

    if (!result.success) {
      toast.error(result.error ?? 'Failed to disconnect app')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['app-connections'] })
    toast.success('App disconnected successfully')
  }

  function getConnectionForApp(appId: string) {
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
