import { createServerClient } from '@/lib/supabase/server'
import { getComposio } from '@/lib/composio/client'
import { getActiveTeamId } from '@/lib/get-active-team'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/apps/callback')

export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(`${siteUrl}/dashboard?error=unauthorized`)
    }

    // Read pending connection from cookie
    const cookieStore = await cookies()
    const pendingCookie = cookieStore.get('composio_pending')?.value

    if (!pendingCookie) {
      return NextResponse.redirect(`${siteUrl}/dashboard?error=no_pending_connection`)
    }

    const pending = JSON.parse(pendingCookie) as {
      connectedAccountId: string
      appId: string
    }

    // Clear the cookie
    cookieStore.delete('composio_pending')

    // Verify the connection is active via Composio
    const composio = getComposio()
    let account: { id?: string; status?: string; accountId?: string } | null = null

    try {
      account = await composio.connectedAccounts.get(pending.connectedAccountId)
    } catch {
      // Connection might still be processing - check via query param if available
      const connectedAccountId =
        request.nextUrl.searchParams.get('connectedAccountId') || pending.connectedAccountId

      try {
        account = await composio.connectedAccounts.get(connectedAccountId)
      } catch {
        return NextResponse.redirect(
          `${siteUrl}/dashboard?error=connection_failed&provider=${pending.appId}`
        )
      }
    }

    // Get the user's active team (respects workspace switcher cookie)
    const teamId = await getActiveTeamId(supabase, user.id)

    if (!teamId) {
      return NextResponse.redirect(`${siteUrl}/dashboard?error=no_team`)
    }

    // Upsert the connection in our DB
    const { error: upsertError } = await supabase.from('app_connections').upsert(
      {
        user_id: user.id,
        team_id: teamId,
        app_id: pending.appId,
        composio_connection_id: pending.connectedAccountId,
        account_label: (account as Record<string, unknown>)?.accountId
          ? String((account as Record<string, unknown>).accountId)
          : pending.appId,
        account_id: String((account as Record<string, unknown>)?.id ?? ''),
        metadata: {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,app_id' }
    )

    if (upsertError) {
      log.error({ err: upsertError }, 'Failed to save connection')
      return NextResponse.redirect(
        `${siteUrl}/dashboard?error=save_failed&provider=${pending.appId}`
      )
    }

    // If the connected app is a known e-commerce platform, update the store record too
    const ecommercePlatforms = ['shopify', 'mercadolivre']
    if (ecommercePlatforms.includes(pending.appId)) {
      await supabase
        .from('stores')
        .update({
          platform: pending.appId,
          platform_store_id: pending.connectedAccountId,
        })
        .eq('team_id', teamId)
    }

    // Revalidate pages that show connection status
    revalidatePath('/(dashboard)/apps')
    revalidatePath('/(dashboard)/workspace')

    return NextResponse.redirect(`${siteUrl}/workspace?connected=${pending.appId}`)
  } catch (error) {
    log.error({ err: error }, 'App callback error')
    return NextResponse.redirect(`${siteUrl}/dashboard?error=oauth_failed`)
  }
}
