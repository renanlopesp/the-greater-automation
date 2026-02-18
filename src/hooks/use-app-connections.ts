'use client'

import { useQuery } from '@tanstack/react-query'
import { getAvailableApps } from '@/lib/composio/actions/get-available-apps'
import {
  getAppConnections,
  getWorkspaceConnections,
} from '@/lib/composio/actions/get-app-connections'
import { getComposioApps } from '@/lib/composio/actions/get-composio-apps'
import type { AvailableApp } from '@/lib/composio/actions/get-available-apps'
import type { AppConnection, WorkspaceConnection } from '@/lib/composio/actions/get-app-connections'
import type { ComposioApp } from '@/lib/composio/actions/get-composio-apps'

interface AppConnectionsData {
  connections: AppConnection[]
  availableApps: AvailableApp[]
  composioApps: ComposioApp[]
}

export function useAppConnections(teamId?: string, hasWorkspaceFeature?: boolean) {
  const personalQuery = useQuery({
    queryKey: ['app-connections'],
    queryFn: async (): Promise<AppConnectionsData> => {
      const [connections, availableApps, composioApps] = await Promise.all([
        getAppConnections(),
        getAvailableApps(),
        getComposioApps(),
      ])
      return { connections, availableApps, composioApps }
    },
    staleTime: 30_000,
  })

  const workspaceQuery = useQuery({
    queryKey: ['workspace-connections', teamId],
    queryFn: () => getWorkspaceConnections(teamId!),
    enabled: !!teamId && !!hasWorkspaceFeature,
    staleTime: 30_000,
  })

  return {
    ...personalQuery,
    workspaceConnections: (workspaceQuery.data ?? []) as WorkspaceConnection[],
  }
}
