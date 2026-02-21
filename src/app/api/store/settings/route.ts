import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's team
  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!member) return NextResponse.json({ error: 'No team' }, { status: 400 })

  const serviceClient = createServiceRoleClient()
  const { data: store } = await serviceClient
    .from('stores')
    .select('id, settings')
    .eq('team_id', member.team_id)
    .single()
  if (!store) return NextResponse.json({ error: 'No store' }, { status: 404 })

  const body = (await request.json()) as {
    name?: string
    segment?: string
    default_threshold?: number
    settings?: Record<string, unknown>
  }

  // Update store info (name, segment)
  if (body.name !== undefined || body.segment !== undefined) {
    const updates: Record<string, string> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.segment !== undefined) updates.segment = body.segment
    await serviceClient.from('stores').update(updates).eq('id', store.id)
  }

  // Update default alert threshold
  if (body.default_threshold !== undefined) {
    await serviceClient.from('store_stock_alerts').upsert(
      {
        store_id: store.id,
        product_id: null,
        threshold: body.default_threshold,
        is_enabled: true,
      },
      { onConflict: 'store_id,product_id' }
    )
  }

  // Update notification settings (merge into existing settings)
  if (body.settings) {
    const currentSettings = (store.settings ?? {}) as Record<string, unknown>
    const newSettings = { ...currentSettings, ...body.settings }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await serviceClient
      .from('stores')
      .update({ settings: newSettings as any })
      .eq('id', store.id)
  }

  return NextResponse.json({ ok: true })
}

export async function GET(_request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!member) return NextResponse.json({ error: 'No team' }, { status: 400 })

  const serviceClient = createServiceRoleClient()
  const { data: store } = await serviceClient
    .from('stores')
    .select('id, name, segment, platform, platform_store_id, last_sync_at, settings')
    .eq('team_id', member.team_id)
    .single()

  // Get default alert threshold
  let defaultThreshold = 5
  if (store) {
    const { data: alert } = await serviceClient
      .from('store_stock_alerts')
      .select('threshold')
      .eq('store_id', store.id)
      .is('product_id', null)
      .single()
    if (alert) defaultThreshold = alert.threshold
  }

  return NextResponse.json({ store, default_threshold: defaultThreshold })
}
