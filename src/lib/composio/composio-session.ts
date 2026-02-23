import { getComposio } from './client'

/**
 * Create a Composio session for a user and get their available tools.
 *
 * @param userId - The Supabase user UUID (used as entityId in Composio)
 * @param toolkits - App IDs to include (e.g. ['shopify', 'github']).
 *   When provided, the session loads actual app tools for those toolkits.
 *   When omitted, no app-specific tools are loaded.
 * @param connectedAccounts - Map of toolkit slug → Composio connected account ID.
 *   Required for custom auth configs (non-Composio-managed) so the ToolRouter
 *   session can find the right connection. e.g. { shopify: 'ca_Erafp6_YNOcY' }
 * @param manageConnections - Whether to include meta-tools for connection management.
 *   Defaults to false. Set to true only when the AI needs to help users connect new apps.
 */
export async function getComposioSession(
  userId: string,
  toolkits?: string[],
  connectedAccounts?: Record<string, string>,
  manageConnections = false
) {
  const composio = getComposio()
  return composio.create(userId, {
    ...(toolkits && toolkits.length > 0 ? { toolkits } : {}),
    ...(connectedAccounts && Object.keys(connectedAccounts).length > 0
      ? { connectedAccounts }
      : {}),
    manageConnections,
  })
}
