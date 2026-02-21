import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NuvemshopClient } from '@/lib/nuvemshop/client'

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const code = request.nextUrl.searchParams.get('code')
  const stateParam = request.nextUrl.searchParams.get('state')

  if (!code || !stateParam) {
    return NextResponse.redirect(new URL('/home?error=missing_params', request.url))
  }

  let state: { team_id: string; redirect_uri: string }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
  } catch {
    return NextResponse.redirect(new URL('/home?error=invalid_state', request.url))
  }

  try {
    // exchangeCodeForToken reads NUVEMSHOP_APP_ID and NUVEMSHOP_CLIENT_SECRET from env
    const tokenData = await NuvemshopClient.exchangeCodeForToken(code)

    const serviceSupabase = createServiceRoleClient()

    // Update store with platform credentials
    await serviceSupabase
      .from('stores')
      .update({
        platform: 'nuvemshop',
        platform_store_id: String(tokenData.user_id),
        platform_access_token: tokenData.access_token,
      })
      .eq('team_id', state.team_id)

    // Get store record for webhook registration
    const { data: store } = await serviceSupabase
      .from('stores')
      .select('id, platform_store_id, platform_access_token')
      .eq('team_id', state.team_id)
      .single()

    // Trigger initial sync (fire-and-forget)
    const origin = request.nextUrl.origin
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

    return NextResponse.redirect(new URL(state.redirect_uri || '/home', request.url))
  } catch (error) {
    console.error('[nuvemshop/callback] OAuth error:', error)
    return NextResponse.redirect(new URL('/home?error=oauth_failed', request.url))
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
