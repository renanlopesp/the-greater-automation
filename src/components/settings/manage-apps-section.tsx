'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import AppIntegrationRow from '@/components/settings/app-integration-row'
import type { ComposioApp } from '@/lib/composio/actions/get-composio-apps'
import { useAppConnections } from '@/hooks/use-app-connections'
import { initiateAppConnection } from '@/lib/composio/actions/initiate-connection'
import { disconnectApp } from '@/lib/composio/actions/disconnect-app'

interface ManageAppsSectionProps {
  teamId?: string
  planFeatures?: Record<string, boolean>
}

export default function ManageAppsSection({ teamId, planFeatures }: ManageAppsSectionProps) {
  const [query, setQuery] = useState('')
  const hasWorkspaceFeature = planFeatures?.workspace_connections ?? false
  const { data, isLoading, workspaceConnections } = useAppConnections(teamId, hasWorkspaceFeature)
  const queryClient = useQueryClient()

  const connections = useMemo(() => data?.connections ?? [], [data?.connections])
  const availableApps = useMemo(() => data?.availableApps ?? [], [data?.availableApps])
  const composioApps = useMemo(() => data?.composioApps ?? [], [data?.composioApps])

  const integrationMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const app of availableApps) {
      map[app.id] = app.integrationId
    }
    return map
  }, [availableApps])

  // Build a lookup from the dynamic Composio apps catalog
  const composioAppsMap = useMemo(() => {
    const map = new Map<string, ComposioApp>()
    for (const app of composioApps) {
      map.set(app.id, app)
    }
    return map
  }, [composioApps])

  const connectableApps = useMemo(() => {
    const ids = new Set(availableApps.map((a) => a.id))
    return composioApps.filter((app) => ids.has(app.id))
  }, [availableApps, composioApps])

  const allApps = useMemo((): ComposioApp[] => {
    const knownIds = new Set(connectableApps.map((a) => a.id))
    const fromConnections = connections
      .filter((c) => !knownIds.has(c.app_id))
      .map((c) => composioAppsMap.get(c.app_id))
      .filter((a): a is ComposioApp => !!a)
    return [...connectableApps, ...fromConnections]
  }, [connectableApps, connections, composioAppsMap])

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
      <div className="bg-muted/50 flex items-start gap-3 rounded-lg border px-4 py-3">
        <ShieldCheck className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-muted-foreground text-xs leading-relaxed">
          App connections are managed securely through{' '}
          <a
            href="https://docs.composio.dev/docs/managed-authentication"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            Composio
          </a>
          . Your credentials are encrypted and tokens are automatically refreshed — we never store
          your passwords.
        </p>
      </div>
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
        {workspaceConnections.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            <h3 className="text-sm font-medium">Workspace connections</h3>
            <p className="text-muted-foreground text-xs">
              Apps connected by your team members. Connect your own account to use these
              integrations.
            </p>
            {workspaceConnections.map((conn, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={conn.user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {conn.user.fullName?.[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm">{conn.appId}</span>
                  <span className="text-muted-foreground text-xs">
                    Connected by {conn.user.fullName ?? 'Unknown'}
                    {conn.accountLabel ? ` · ${conn.accountLabel}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
