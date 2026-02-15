'use client'

import { useQuery } from '@tanstack/react-query'
import { getAppActions } from '@/lib/composio/actions/get-app-actions'
import type { ComposioAppAction } from '@/lib/composio/actions/get-app-actions'

export function useAppActions(appId: string | null) {
  return useQuery({
    queryKey: ['app-actions', appId],
    queryFn: () => getAppActions(appId!),
    enabled: !!appId,
    staleTime: 5 * 60_000, // 5 minutes — actions don't change often
  })
}

export type { ComposioAppAction }
