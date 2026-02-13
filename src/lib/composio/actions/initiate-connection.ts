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

    // Use provided integration ID, fall back to auto-discovery
    const resolvedIntegrationId = integrationId || (await getIntegrationId(appId))

    const connectionRequest = await composio.connectedAccounts.initiate({
      appName: appId,
      entityId: user.id,
      redirectUri: callbackUrl,
      ...(resolvedIntegrationId && { integrationId: resolvedIntegrationId }),
    })

    // Store pending connection in cookie for the callback route
    const cookieStore = await cookies()
    cookieStore.set(
      'composio_pending',
      JSON.stringify({
        connectedAccountId: connectionRequest.connectedAccountId,
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

    if (!connectionRequest.redirectUrl) {
      return { error: 'Failed to get redirect URL from Composio' }
    }

    return { redirectUrl: connectionRequest.redirectUrl }
  } catch (error) {
    console.error('App connect error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to initiate connection' }
  }
}
