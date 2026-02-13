'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getAvailableApps,
  getAppConnections,
  type AvailableApp,
  type AppConnection,
} from '@/lib/composio/actions'

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
