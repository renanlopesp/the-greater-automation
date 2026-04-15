import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

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
          is_enabled: true,
        },
        { onConflict: 'store_id,product_id' }
      )
    )
  }

  // Update notification settings (merge into existing settings)
  if (body.settings) {
    const currentSettings = (store.settings ?? {}) as Record<string, unknown>
    const newSettings = { ...currentSettings, ...body.settings }
    writes.push(
      serviceClient
        .from('stores')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ settings: newSettings as any })
        .eq('id', store.id)
    )
  }

  await Promise.all(writes)

  // Update Sales Analyst agent's notification_settings when daily summary settings change
  if (body.agent_notifications) {
    const { daily_summary_enabled, report_hour } = body.agent_notifications

    // Find the Sales Analyst agent (name contains "Sales" or role is "caixa")
    const { data: agents } = await serviceClient
      .from('agents')
      .select('id, name, notification_settings')
      .eq('team_id', member.team_id)

    const salesAgent = agents?.find(
      (a) => a.name.toLowerCase().includes('sales') || a.name.toLowerCase().includes('caixa')
    )

    if (salesAgent) {
      const currentNotifSettings =
        (salesAgent.notification_settings as Record<string, unknown>) ?? {}
      await serviceClient
        .from('agents')
        .update({
          notification_settings: {
            ...currentNotifSettings,
            telegram_enabled: daily_summary_enabled,
            report_hour,
          } as unknown as Json,
        })
        .eq('id', salesAgent.id)
    }
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
