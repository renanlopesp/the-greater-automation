import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncProducts, syncOrders } from '@/lib/nuvemshop/sync'

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
      return {
        store_id: store.id,
        name: store.name,
        status: 'success' as const,
        products: productResult.synced,
        orders: orderResult.synced,
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
