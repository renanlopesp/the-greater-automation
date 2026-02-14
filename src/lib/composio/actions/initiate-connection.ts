'use server'

import { cookies } from 'next/headers'
import { getComposio } from '../client'
import { getIntegrationId } from '../action-map'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Initiates an OAuth connection via Composio.
 * Returns a redirect URL for the OAuth flow, or an error message.
 */
export async function initiateAppConnection(
  appId: string,
  integrationId?: string
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

    const connectionRequest = await composio.connectedAccounts.initiate(user.id, authConfigId, {
      callbackUrl,
    })

    // Store pending connection in cookie for the callback route
    const cookieStore = await cookies()
    cookieStore.set(
      'composio_pending',
      JSON.stringify({
        connectedAccountId: connectionRequest.id,
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

    // V2 may return `redirectUrl` or `url`
    const req = connectionRequest as unknown as Record<string, unknown>
    const redirect = req.redirectUrl ?? req.url
    if (!redirect || typeof redirect !== 'string') {
      return { error: 'Failed to get redirect URL from Composio' }
    }

    return { redirectUrl: redirect }
  } catch (error) {
    console.error('App connect error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to initiate connection' }
  }
}
