import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendDailySummary } from '@/lib/retail/sales-summary'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Get current hour in BRT (UTC-3)
  const now = new Date()
  const brtHour = (now.getUTCHours() - 3 + 24) % 24

  // Find stores that have daily summary enabled at current hour
  // Default time is 21:00 BRT, stored in settings.daily_summary_hour
  const { data: stores } = await supabase.from('stores').select('id, name, settings')

  if (!stores || stores.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0
  for (const store of stores) {
    const settings = store.settings as Record<string, unknown> | null
    const summaryHour = (settings?.daily_summary_hour as number) ?? 21
    const summaryEnabled = settings?.daily_summary_enabled !== false // Default enabled

    if (!summaryEnabled || summaryHour !== brtHour) continue

    try {
      await sendDailySummary(store.id)
      sent++
    } catch (error) {
      console.error(`[daily-summary] Error for store ${store.name}:`, error)
    }
  }

  return NextResponse.json({ sent, checked: stores.length })
}
