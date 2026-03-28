'use server'

import { getComposio } from '../client'
import { createLogger } from '@/lib/logger'

const log = createLogger('composio/get-available-apps')

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
    const result = await composio.authConfigs.list()
    const items = result.items

    if (!Array.isArray(items)) return []

    return items.map((item) => {
      const i = item as { id: string; toolkit?: { slug: string }; name?: string }
      return {
        id: i.toolkit?.slug?.toLowerCase() || '',
        integrationId: i.id,
        name: i.name || i.toolkit?.slug || '',
      }
    })
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch Composio integrations')
    return []
  }
}
