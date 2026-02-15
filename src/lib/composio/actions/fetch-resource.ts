'use server'

import { createServerClient } from '@/lib/supabase/server'

export interface ResourceItem {
  label: string
  value: string
  raw?: unknown
}

export interface FetchResourceResult {
  items: ResourceItem[]
  error?: string
}

/**
 * Fetch resources from a connected app for populating form dropdowns.
 * Executes a Composio "Find/List" action using the user's OAuth connection.
 *
 * @param appId - The app ID (e.g., "github")
 * @param fetchAction - The Composio action to execute (e.g., "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER")
 * @param displayField - The field path in results to use as display label
 * @param valueField - The field path in results to use as the value
 * @param params - Additional parameters for the action
 * @param resultPath - Path to the array in the result (default: tries root, then "data")
 */
export async function fetchAppResource(
  appId: string,
  fetchAction: string,
  displayField: string,
  valueField: string,
  params?: Record<string, unknown>,
  resultPath?: string
): Promise<FetchResourceResult> {
  try {
    // 1. Get current user
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { items: [], error: 'Not authenticated' }
    }

    const apiKey = process.env.COMPOSIO_API_KEY
    if (!apiKey) {
      return { items: [], error: 'COMPOSIO_API_KEY not configured' }
    }

    // 2. Resolve the Composio connection UUID via their API
    //    The DB stores SDK-format IDs (ca_xxx) but the REST API v2 requires UUIDs.
    const connUuid = await resolveConnectionUuid(apiKey, user.id, appId)
    if (!connUuid) {
      return { items: [], error: `No active ${appId} connection found` }
    }

    // 3. Execute the fetch action via Composio REST API directly
    const response = await fetch(
      `https://backend.composio.dev/api/v2/actions/${encodeURIComponent(fetchAction)}/execute`,
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectedAccountId: connUuid,
          input: params ?? {},
        }),
      }
    )

    if (!response.ok) {
      return { items: [], error: `Composio API error: ${response.status}` }
    }

    const appResult = (await response.json()) as {
      successfull?: boolean
      data?: unknown
      error?: string
    }

    if (!appResult.successfull) {
      return { items: [], error: appResult.error || `Failed to fetch ${fetchAction}` }
    }

    // Find the array in the result
    let rawItems: unknown[] = []
    const data = appResult.data

    if (resultPath) {
      // Use specified path
      const pathResult = getNestedValue(data, resultPath)
      if (Array.isArray(pathResult)) rawItems = pathResult
    } else if (Array.isArray(data)) {
      rawItems = data
    } else if (data && typeof data === 'object') {
      // Try common paths
      const obj = data as Record<string, unknown>
      if (Array.isArray(obj.data)) rawItems = obj.data
      else if (Array.isArray(obj.items)) rawItems = obj.items
      else if (Array.isArray(obj.results)) rawItems = obj.results
      else if (Array.isArray(obj.repositories)) rawItems = obj.repositories
      else if (Array.isArray(obj.channels)) rawItems = obj.channels
      else if (Array.isArray(obj.users)) rawItems = obj.users
      else if (Array.isArray(obj.members)) rawItems = obj.members
    }

    // 4. Map to ResourceItem format
    const items = rawItems
      .map((item): ResourceItem | null => {
        const label = getNestedValue(item, displayField)
        const value = getNestedValue(item, valueField)
        if (label == null || value == null) return null
        return {
          label: String(label),
          value: String(value),
          raw: item,
        }
      })
      .filter((item): item is ResourceItem => item !== null)

    return { items }
  } catch (error) {
    console.error(`Error fetching resource for ${appId}/${fetchAction}:`, error)
    return {
      items: [],
      error: error instanceof Error ? error.message : 'Failed to fetch resources',
    }
  }
}

/**
 * Resolve a Composio connection UUID for a given user + app.
 * The DB stores SDK-format IDs (ca_xxx) but the REST API v2 requires UUIDs.
 * This queries Composio's connected accounts API filtered by user_uuid (entity ID).
 */
async function resolveConnectionUuid(
  apiKey: string,
  userId: string,
  appId: string
): Promise<string | null> {
  const resp = await fetch(
    `https://backend.composio.dev/api/v1/connectedAccounts?user_uuid=${encodeURIComponent(userId)}&showActiveOnly=true`,
    { headers: { 'x-api-key': apiKey } }
  )
  if (!resp.ok) return null

  const data = (await resp.json()) as {
    items?: Array<{ id: string; appName: string; status: string }>
  }
  const match = data.items?.find(
    (c) => c.appName?.toLowerCase() === appId.toLowerCase() && c.status === 'ACTIVE'
  )
  return match?.id ?? null
}

/**
 * Get a nested value from an object using dot notation.
 * e.g., getNestedValue(obj, "owner.login") returns obj.owner.login
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (obj == null) return undefined
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}
