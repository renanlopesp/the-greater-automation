import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { checkPriceMonitors } from '@/lib/retail/price-monitors'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Get all stores that have active price monitors
  const { data: storeIds } = await supabase
    .from('store_price_monitors')
    .select('store_id')
    .eq('is_active', true)

  const uniqueStoreIds = [...new Set((storeIds ?? []).map((s) => s.store_id as string))]

  let checked = 0
  for (const storeId of uniqueStoreIds) {
    try {
      await checkPriceMonitors(storeId)
      checked++
    } catch (error) {
      console.error(`[price-check] Error for store ${storeId}:`, error)
    }
  }

  return NextResponse.json({ checked, stores: uniqueStoreIds.length })
}
