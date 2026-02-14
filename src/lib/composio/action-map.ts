/**
 * Maps internal app action identifiers to Composio action names.
 *
 * Format: `{app_id}:{action_id}` → `COMPOSIO_ACTION_NAME`
 *
 * Composio uses SCREAMING_SNAKE_CASE: `APP_ACTION_NAME`
 */

const ACTION_MAP: Record<string, string> = {
  // GitHub
  'github:create_issue': 'GITHUB_CREATE_ISSUE',
  'github:create_pr_comment': 'GITHUB_CREATE_PR_COMMENT',
  'github:list_repos': 'GITHUB_LIST_REPOS',
  'github:star_repo': 'GITHUB_STAR_REPO',

  // Notion
  'notion:create_page': 'NOTION_CREATE_PAGE',
  'notion:update_page': 'NOTION_UPDATE_PAGE',
  'notion:search': 'NOTION_SEARCH',
  'notion:query_database': 'NOTION_QUERY_DATABASE',

  // Slack
  'slack:send_message': 'SLACK_SEND_MESSAGE',
  'slack:send_dm': 'SLACK_SEND_DM',
  'slack:create_channel': 'SLACK_CREATE_CHANNEL',
  'slack:list_channels': 'SLACK_LIST_CHANNELS',

  // LinkedIn
  'linkedin:create_post': 'LINKEDIN_CREATE_POST',
  'linkedin:share_article': 'LINKEDIN_SHARE_ARTICLE',

  // Discord
  'discord:send_message': 'DISCORD_SEND_MESSAGE',
  'discord:send_embed': 'DISCORD_SEND_EMBED',
  'discord:create_thread': 'DISCORD_CREATE_THREAD',
}

/**
 * Resolve our internal `app_id:action_id` pair to the Composio action name.
 * Throws if no mapping is found.
 */
export function getComposioActionName(appId: string, actionId: string): string {
  const key = `${appId}:${actionId}`
  const composioAction = ACTION_MAP[key]
  if (!composioAction) {
    throw new Error(`No Composio action mapping for "${key}"`)
  }
  return composioAction
}

/**
 * Cache of app ID → Composio integration ID, auto-discovered from the API.
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
      _integrationCache[appName.toLowerCase()] = item.id
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
