import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

const StoreSettingsPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  segment: z.string().min(1).max(100).optional(),
  platform: z.string().min(1).max(100).optional(),
  default_threshold: z.number().int().min(0).max(100000).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  agent_notifications: z
    .object({
      daily_summary_enabled: z.boolean(),
      report_hour: z.number().int().min(0).max(23),
    })
    .optional(),
})

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

  const rawBody = await request.json().catch(() => null)
  if (!rawBody) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = StoreSettingsPatchSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: Object.keys(parsed.error.flatten().fieldErrors) },
      { status: 400 }
    )
  }
  const body = parsed.data

  // Run independent writes in parallel
  const writes: PromiseLike<unknown>[] = []

  // Update store info (name, segment, platform)
  if (body.name !== undefined || body.segment !== undefined || body.platform !== undefined) {
    const updates: Record<string, string> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.segment !== undefined) updates.segment = body.segment
    if (body.platform !== undefined) updates.platform = body.platform
    writes.push(serviceClient.from('stores').update(updates).eq('id', store.id))
  }

  // Update default alert threshold
  if (body.default_threshold !== undefined) {
    writes.push(
      serviceClient.from('store_stock_alerts').upsert(
        {
          store_id: store.id,
          product_id: null,
          threshold: body.default_threshold,
        },
        { onConflict: 'store_id,product_id' }
      )
    )
  }

  // Update notification settings (merge into existing settings)
  if (body.settings) {
    const currentSettings = (store.settings ?? {}) as Record<string, unknown>
    const newSettings = { ...currentSettings, ...body.settings } as Record<string, unknown>
    writes.push(
      serviceClient
        .from('stores')
        .update({ settings: newSettings as never })
        .eq('id', store.id)
    )
  }

  await Promise.all(writes)

  // Sales-analyst agent notification sync removed in schema refactor 2026-04-15.
  // The legacy `agents.notification_settings` jsonb column was replaced by a
  // dedicated `agent_notification_settings` table. If the daily-summary toggle
  // gets re-wired, point it at that table via a new writer.
  if (body.agent_notifications) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _drift = body.agent_notifications
    // TODO(071): rewrite against agent_notification_settings table.
  }

  return NextResponse.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
