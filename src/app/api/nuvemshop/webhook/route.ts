import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleWebhookEvent } from '@/lib/nuvemshop/webhooks'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const clientSecret = process.env.NUVEMSHOP_CLIENT_SECRET
  if (!clientSecret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const rawBody = await request.text()

  // HMAC verification (required)
  const signature = request.headers.get('x-linkedstore-hmac-sha256')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
  }

  const expectedHmac = crypto.createHmac('sha256', clientSecret).update(rawBody).digest('hex')
  try {
    const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac))
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let payload: { store_id: number; event: string; id: number }
  try {
    payload = JSON.parse(rawBody) as { store_id: number; event: string; id: number }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Find store by platform_store_id
  const { data: store } = await supabase
    .from('stores')
    .select('id, platform_store_id, platform_access_token, team_id')
    .eq('platform_store_id', String(payload.store_id))
    .single()

  if (!store) {
    // Silently ignore unknown stores
    return NextResponse.json({ ok: true })
  }

  try {
    await handleWebhookEvent(store, payload.event, String(payload.id))
  } catch (error) {
    console.error(`[nuvemshop/webhook] Error handling ${payload.event}:`, error)
  }

  return NextResponse.json({ ok: true })
}
