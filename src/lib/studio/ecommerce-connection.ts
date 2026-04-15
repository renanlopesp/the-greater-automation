import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getComposio } from '@/lib/composio/client'

/**
 * Discriminated union — the **only** answer to "which e-commerce backend is
 * this team using?". All studio chat tool dispatch must consult this helper
 * (FR-001 of spec 069) so the mutual-exclusion rule (Nuvemshop OR Composio
 * Shopify, never both) is encoded in one place.
 */
export type StoreConnection =
  | {
      kind: 'nuvemshop'
      storeId: string
      platformStoreId: string
      accessToken: string
    }
  | {
      kind: 'shopify-composio'
      connectedAccountId: string
    }
  | { kind: null }

/**
 * Resolve the team's e-commerce connection.
 *
 * Precedence: when both Nuvemshop and a Composio Shopify connectedAccount
 * exist (legacy state), Nuvemshop wins — it's the DB-backed source of truth
 * and the platform we control end-to-end. The user can disconnect the stale
 * Composio Shopify from settings.
 */
export async function getStoreConnection(teamId: string, userId: string): Promise<StoreConnection> {
  if (!teamId) return { kind: null }

  const svc = createServiceRoleClient()
  const { data: store } = await svc
    .from('stores')
    .select('id, platform, platform_store_id, platform_access_token')
    .eq('team_id', teamId)
    .maybeSingle()

  if (store?.platform === 'nuvemshop' && store.platform_store_id && store.platform_access_token) {
    return {
      kind: 'nuvemshop',
      storeId: store.id,
      platformStoreId: store.platform_store_id,
      accessToken: store.platform_access_token,
    }
  }

  if (userId) {
    try {
      const composio = getComposio()
      const { items } = await composio.connectedAccounts.list({ userIds: [userId] })
      const shopify = (
        items as Array<{ id: string; status: string; toolkit?: { slug?: string } }>
      ).find((a) => a.status === 'ACTIVE' && a.toolkit?.slug?.toLowerCase() === 'shopify')
      if (shopify) {
        return { kind: 'shopify-composio', connectedAccountId: shopify.id }
      }
    } catch {
      // Composio outage shouldn't promote the team to "no connection" — fall through.
    }
  }

  return { kind: null }
}

/** Convenience for the studio chat client: just the discriminator. */
export async function getEcommerceKind(
  teamId: string,
  userId: string
): Promise<StoreConnection['kind']> {
  return (await getStoreConnection(teamId, userId)).kind
}
