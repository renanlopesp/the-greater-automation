'use client'

import { useQuery } from '@tanstack/react-query'
import { getAvailableApps } from '@/lib/composio/actions/get-available-apps'
import { getAppConnections } from '@/lib/composio/actions/get-app-connections'
import type { AvailableApp } from '@/lib/composio/actions/get-available-apps'
import type { AppConnection } from '@/lib/composio/actions/get-app-connections'

interface AppConnectionsData {
  connections: AppConnection[]
  availableApps: AvailableApp[]
}

export function useAppConnections() {
  return useQuery({
    queryKey: ['app-connections'],
    queryFn: async (): Promise<AppConnectionsData> => {
      const [connections, availableApps] = await Promise.all([
        getAppConnections(),
        getAvailableApps(),
      ])
      return { connections, availableApps }
    },
    staleTime: 30_000,
  })
}
