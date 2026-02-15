'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchAppResource } from '@/lib/composio/actions/fetch-resource'
import type { ResourceItem } from '@/lib/composio/actions/fetch-resource'

export type { ResourceItem }

/**
 * Fetches resources for a form field dropdown from a connected OAuth app.
 *
 * @param appId - The app ID (e.g., "github")
 * @param fetchAction - The Composio action to fetch data (e.g., "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER")
 * @param displayField - Field path for the display label
 * @param valueField - Field path for the value
 * @param params - Additional params (e.g., { owner: "octocat", repo: "my-repo" })
 * @param resultPath - Optional path to the array in the result
 * @param enabled - Whether the query should run (default: true)
 */
export function useAppResources(
  appId: string | null,
  fetchAction: string | null,
  displayField: string,
  valueField: string,
  params?: Record<string, unknown>,
  resultPath?: string,
  enabled?: boolean
) {
  return useQuery({
    queryKey: ['app-resources', appId, fetchAction, params],
    queryFn: () =>
      fetchAppResource(appId!, fetchAction!, displayField, valueField, params, resultPath),
    enabled: enabled !== false && !!appId && !!fetchAction,
    staleTime: 2 * 60_000, // 2 minutes — resource data can change
  })
}
