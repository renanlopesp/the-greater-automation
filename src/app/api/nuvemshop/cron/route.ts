import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncProducts, syncOrders } from '@/lib/nuvemshop/sync'
import { checkAbandonedCarts, checkRecoveredCarts } from '@/lib/retail/abandoned-cart'

// Vercel Cron or external cron hits this endpoint every 15 minutes
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Find all Nuvemshop stores that haven't synced in 15+ minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const { data: stores } = await supabase
    .from('stores')
    .select('id, name')
    .eq('platform', 'nuvemshop')
    .not('platform_access_token', 'is', null)
    .or(`last_sync_at.is.null,last_sync_at.lt.${fifteenMinutesAgo}`)

  if (!stores || stores.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No stores need syncing' })
  }

  const settled = await Promise.allSettled(
    stores.map(async (store) => {
      const [productResult, orderResult] = await Promise.all([
        syncProducts(store.id),
        syncOrders(store.id),
      ])

      // Check abandoned carts and recoveries (best-effort, don't fail the sync)
      let abandonedNotified = 0
      let cartRecovered = 0
      try {
        const [abandoned, recovered] = await Promise.all([
          checkAbandonedCarts(store.id),
          checkRecoveredCarts(store.id),
        ])
        abandonedNotified = abandoned.notified
        cartRecovered = recovered.recovered
      } catch {
        // Non-critical — don't fail the sync cycle
      }

      return {
        store_id: store.id,
        name: store.name,
        status: 'success' as const,
        products: productResult.synced,
        orders: orderResult.synced,
        abandoned_carts_notified: abandonedNotified,
        carts_recovered: cartRecovered,
      }
    })
  )

  const results = settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          store_id: stores[i].id,
          name: stores[i].name,
          status: `error: ${r.reason instanceof Error ? r.reason.message : 'unknown'}`,
        }
  )

  return NextResponse.json({ synced: results.length, results })
}
