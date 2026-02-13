import { createServerClient } from '@/lib/supabase/server'
import { getComposio } from '@/lib/composio/client'
import { isComposioApp, getIntegrationId } from '@/lib/composio/action-map'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { app_id } = body as { app_id?: string }

    if (!app_id || !isComposioApp(app_id)) {
      return NextResponse.json({ error: 'Invalid or unsupported app_id' }, { status: 400 })
    }

    const composio = getComposio()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const callbackUrl = `${siteUrl}/api/apps/callback`

    // Auto-discover custom integration ID from Composio API
    const integrationId = await getIntegrationId(app_id)

    // Initiate the Composio OAuth connection
    const connectionRequest = await composio.connectedAccounts.initiate({
      appName: app_id,
      entityId: user.id,
      redirectUri: callbackUrl,
      ...(integrationId && { integrationId }),
    })

    // Store the pending connection info in a cookie so the callback can match it
    const cookieStore = await cookies()
    cookieStore.set(
      'composio_pending',
      JSON.stringify({
        connectedAccountId: connectionRequest.connectedAccountId,
        appId: app_id,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      }
    )

    return NextResponse.json({
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.connectedAccountId,
    })
  } catch (error) {
    console.error('App connect error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
