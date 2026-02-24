import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NuvemshopClient } from '@/lib/nuvemshop/client'

export async function GET(request: NextRequest) {
  // Use public URL to avoid localhost redirects when behind ngrok/proxy
  const origin =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', origin))

  const code = request.nextUrl.searchParams.get('code')
  const stateParam = request.nextUrl.searchParams.get('state')

  if (!code || !stateParam) {
    return NextResponse.redirect(new URL('/workspace?error=missing_params', origin))
  }

  let state: { team_id: string; redirect_uri: string }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    return NextResponse.redirect(new URL('/workspace?error=invalid_state', origin))
  }

  try {
    // exchangeCodeForToken reads NUVEMSHOP_APP_ID and NUVEMSHOP_CLIENT_SECRET from env
    const tokenData = await NuvemshopClient.exchangeCodeForToken(code)

    const serviceSupabase = createServiceRoleClient()

    // Try to update existing store first
    const { data: updated } = await serviceSupabase
      .from('stores')
      .update({
        platform: 'nuvemshop',
        platform_store_id: String(tokenData.user_id),
        platform_access_token: tokenData.access_token,
      })
      .eq('team_id', state.team_id)
      .select('id')

    // If no store exists (during onboarding), create a minimal one
    if (!updated || updated.length === 0) {
      await serviceSupabase.from('stores').insert({
        team_id: state.team_id,
        name: 'My Store',
        segment: 'moda',
        platform: 'nuvemshop',
        platform_store_id: String(tokenData.user_id),
        platform_access_token: tokenData.access_token,
        onboarding_completed: false,
      })
    }

    // Get store record for webhook registration
    const { data: store } = await serviceSupabase
      .from('stores')
      .select('id, platform_store_id, platform_access_token')
      .eq('team_id', state.team_id)
      .single()

    // Trigger initial sync (fire-and-forget)
    fetch(`${origin}/api/nuvemshop/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-team-id': state.team_id,
      },
    }).catch(() => {})

    // Register webhooks (fire-and-forget)
    if (store?.platform_access_token && store?.platform_store_id && store?.id) {
      const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
      registerWebhooks(client, store.id, origin, serviceSupabase).catch(console.error)
    }

    const redirectPath = state.redirect_uri || '/workspace'
    return NextResponse.redirect(new URL(redirectPath, origin))
  } catch (error) {
    console.error('[nuvemshop/callback] OAuth error:', error)
    return NextResponse.redirect(new URL('/workspace?error=oauth_failed', origin))
  }
}

async function registerWebhooks(
  client: NuvemshopClient,
  storeId: string,
  origin: string,
  supabase: ReturnType<typeof createServiceRoleClient>
) {
  const webhookUrl = `${origin}/api/nuvemshop/webhook`
  // createWebhook(event, url) — event first, url second
  const events = ['product/updated', 'order/created', 'order/paid']

  for (const event of events) {
    try {
      const webhook = await client.createWebhook(event, webhookUrl)
      await supabase.from('nuvemshop_webhooks').insert({
        store_id: storeId,
        external_webhook_id: String(webhook.id),
        event,
      })
    } catch (error) {
      console.error(`[nuvemshop/callback] Failed to register webhook ${event}:`, error)
    }
  }
}
