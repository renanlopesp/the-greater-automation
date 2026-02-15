import { getComposio } from './client'

/**
 * Create a Composio session for a user and get their available tools.
 * The session automatically discovers which apps the user has connected.
 *
 * @param userId - The Supabase user UUID (used as entityId in Composio)
 */
export async function getComposioSession(userId: string) {
  const composio = getComposio()
  return composio.create(userId)
}
