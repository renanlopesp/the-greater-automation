import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendDailySummary } from '@/lib/retail/sales-summary'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
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

  const eligibleStores = stores.filter((store) => {
    const settings = store.settings as Record<string, unknown> | null
    const summaryHour = (settings?.daily_summary_hour as number) ?? 21
    const summaryEnabled = settings?.daily_summary_enabled !== false // Default enabled
    return summaryEnabled && summaryHour === brtHour
  })

  const results = await Promise.allSettled(
    eligibleStores.map(async (store) => {
      await sendDailySummary(store.id)
    })
  )

  let sent = 0
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      sent++
    } else {
      console.error(
        `[daily-summary] Error for store ${eligibleStores[i].name}:`,
        (results[i] as PromiseRejectedResult).reason
      )
    }
  }

  return NextResponse.json({ sent, checked: stores.length })
}
