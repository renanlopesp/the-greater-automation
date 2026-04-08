/**
 * Composio integration ID resolution.
 * Auto-discovers auth config IDs from the Composio API and caches them.
 */

let _integrationCache: Record<string, string> | null = null

/**
 * Fetches integration IDs from Composio API and caches them.
 * Matches custom auth configs by toolkit slug.
 */
async function loadIntegrations(): Promise<Record<string, string>> {
  if (_integrationCache) return _integrationCache

  const { getComposio } = await import('./client')
  const composio = getComposio()
  const result = await composio.authConfigs.list()
  const items = result.items || []

  _integrationCache = {}
  for (const item of items) {
    const appName = item.toolkit?.slug
    if (appName && item.id) {
      const key = appName.toLowerCase()
      // Prefer OAuth2 over API_KEY when multiple auth configs exist for the same app
      const existing = _integrationCache[key]
      if (!existing || (item as { authScheme?: string }).authScheme === 'OAUTH2') {
        _integrationCache[key] = item.id
      }
    }
  }
  return _integrationCache
}

/**
 * Get the Composio integration ID for an app, auto-discovered from the API.
 * Returns undefined if no custom integration exists for this app.
 */
export async function getIntegrationId(appId: string): Promise<string | undefined> {
  const cache = await loadIntegrations()
  return cache[appId.toLowerCase()]
}
