'use server'

import { getComposio } from '../client'

export interface AvailableApp {
  id: string
  integrationId: string
  name: string
}

/**
 * Fetches available app integrations from Composio.
 * Server-only — never exposed as an API route.
 */
export async function getAvailableApps(): Promise<AvailableApp[]> {
  try {
    const composio = getComposio()
    const result = await composio.integrations.list()
    const items = (result as { items?: unknown[] }).items || result

    if (!Array.isArray(items)) return []

    return items.map((item) => {
      const i = item as { id: string; appName?: string; appId?: string; name?: string }
      return {
        id: (i.appName || i.appId || '').toLowerCase(),
        integrationId: i.id,
        name: i.name || i.appName || i.appId || '',
      }
    })
  } catch (error) {
    console.error('Failed to fetch Composio integrations:', error)
    return []
  }
}
