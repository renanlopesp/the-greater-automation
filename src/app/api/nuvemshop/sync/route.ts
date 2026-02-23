import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { syncProducts } from '@/lib/nuvemshop/sync'

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient()

  // Internal call from retail-tools STORE_TRIGGER_SYNC (sends x-service-key + store_id in body)
  const serviceKey = request.headers.get('x-service-key')
  const internalTeamId = request.headers.get('x-team-id')

  let storeId: string | null = null

  if (serviceKey && serviceKey === process.env.INTERNAL_SERVICE_KEY) {
    // Authenticated internal service call — body contains store_id directly
    try {
      const body = await request.json()
      if (body.store_id) {
        storeId = body.store_id as string
      }
    } catch {
      // ignore parse errors
    }
  } else if (internalTeamId) {
    // Internal call from callback (x-team-id header, no auth check needed — localhost only)
    const { data: store } = await supabase
      .from('stores')
      .select('id, platform_access_token')
      .eq('team_id', internalTeamId)
      .single()

    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 })
    if (!store.platform_access_token) {
      return NextResponse.json({ error: 'Store not connected to a platform' }, { status: 400 })
    }
    storeId = store.id
  } else {
    // User-initiated sync — require auth
    const authSupabase = await createServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await authSupabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!member) return NextResponse.json({ error: 'No team found' }, { status: 400 })

    const { data: store } = await supabase
      .from('stores')
      .select('id, platform_access_token')
      .eq('team_id', member.team_id)
      .single()

    if (!store) return NextResponse.json({ error: 'No store found' }, { status: 404 })
    if (!store.platform_access_token) {
      return NextResponse.json({ error: 'Store not connected to a platform' }, { status: 400 })
    }
    storeId = store.id
  }

  if (!storeId) {
    return NextResponse.json({ error: 'Could not determine store' }, { status: 400 })
  }

  try {
    const result = await syncProducts(storeId)
    return NextResponse.json({
      status: 'completed',
      products_synced: result.synced,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
    })
  } catch (error) {
    console.error('[nuvemshop/sync] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
