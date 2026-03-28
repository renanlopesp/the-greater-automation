'use server'

import { cookies } from 'next/headers'
import { getComposio } from '../client'
import { getIntegrationId } from '../integrations'
import { createServerClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('composio/initiate-connection')

/**
 * Initiates an OAuth connection via Composio.
 * Returns a redirect URL for the OAuth flow, or an error message.
 *
 * @param appId - The app slug (e.g. 'shopify', 'gmail')
 * @param integrationId - Optional auth config ID override
 * @param connectionData - Optional app-specific fields (e.g. { subdomain: 'my-store' } for Shopify)
 */
export async function initiateAppConnection(
  appId: string,
  integrationId?: string,
  connectionData?: Record<string, unknown>
): Promise<{ redirectUrl: string } | { error: string }> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const composio = getComposio()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const callbackUrl = `${siteUrl}/api/apps/callback`

    // Resolve auth config ID: V2 initiate(userId, authConfigId, options)
    // The second param is the auth config ID (e.g. "ac_xxx"), NOT the toolkit slug
    const authConfigId = integrationId || (await getIntegrationId(appId))
    if (!authConfigId) {
      return {
        error: `No auth config found for ${appId}. Set up the integration in Composio first.`,
      }
    }

    let redirectUrl: string | null = null
    let connectionId: string

    if (connectionData) {
      // Use lower-level client to pass connection.data for app-specific required fields
      // (e.g. Shopify store subdomain). The SDK's initiate() only supports connection.state
      // which requires authScheme — connection.data is for arbitrary integration fields.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawClient = (composio as any).client
      const response = await rawClient.connectedAccounts.create({
        auth_config: { id: authConfigId },
        connection: {
          callback_url: callbackUrl,
          user_id: user.id,
          data: connectionData,
          allow_multiple: true,
        },
      })
      connectionId = response.id
      redirectUrl = response.connectionData?.val?.redirectUrl ?? null
    } else {
      const connectionRequest = await composio.connectedAccounts.initiate(user.id, authConfigId, {
        callbackUrl,
        allowMultiple: true,
      })
      connectionId = connectionRequest.id
      const req = connectionRequest as unknown as Record<string, unknown>
      redirectUrl = (req.redirectUrl ?? req.url) as string | null
    }

    // Store pending connection in cookie for the callback route
    const cookieStore = await cookies()
    cookieStore.set(
      'composio_pending',
      JSON.stringify({
        connectedAccountId: connectionId,
        appId,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      }
    )

    if (!redirectUrl) {
      return { error: 'Failed to get redirect URL from Composio' }
    }

    return { redirectUrl }
  } catch (error) {
    log.error({ err: error }, 'App connect error')
    return { error: error instanceof Error ? error.message : 'Failed to initiate connection' }
  }
}
