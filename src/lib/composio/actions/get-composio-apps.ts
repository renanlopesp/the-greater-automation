'use server'

import { getComposio } from '../client'

export interface ComposioApp {
  id: string
  name: string
  logoUrl: string
  iconSlug: string
  category: string
  authType: 'oauth' | 'api_key' | 'none'
  hasTriggers: boolean
}

// Module-level cache (per server instance, 1-hour TTL)
let _cache: { apps: ComposioApp[]; ts: number } | null = null
const CACHE_TTL = 3_600_000

/**
 * Fetches the full Composio app catalog via `toolkits.get()`.
 * Results are cached in-memory for 1 hour per server instance.
 */
export async function getComposioApps(): Promise<ComposioApp[]> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return _cache.apps
  }

  try {
    const composio = getComposio()
    // toolkits.get(query) returns ToolKitListResponse (an array of ToolKitItem)
    // Fields are camelCase (SDK transforms from snake_case)
    const items = await composio.toolkits.get({ sortBy: 'alphabetically' })

    if (!Array.isArray(items)) return _cache?.apps ?? []

    const apps: ComposioApp[] = items.map((item) => {
      const t = item as {
        slug: string
        name: string
        meta: {
          logo?: string
          categories?: Array<{ name: string; slug: string }>
          triggersCount?: number
        }
        authSchemes?: string[]
        composioManagedAuthSchemes?: string[]
        noAuth?: boolean
      }

      const authSchemes = t.authSchemes ?? t.composioManagedAuthSchemes ?? []
      let authType: ComposioApp['authType'] = 'api_key'
      if (t.noAuth) authType = 'none'
      else if (authSchemes.some((s) => /oauth/i.test(s))) authType = 'oauth'

      return {
        id: t.slug,
        name: t.name ?? t.slug,
        logoUrl: t.meta?.logo ?? '',
        iconSlug: t.slug,
        category: t.meta?.categories?.[0]?.name ?? 'Other',
        authType,
        hasTriggers: (t.meta?.triggersCount ?? 0) > 0,
      }
    })

    _cache = { apps, ts: Date.now() }
    return apps
  } catch (error) {
    console.error('Failed to fetch Composio apps catalog:', error)
    return _cache?.apps ?? []
  }
}
