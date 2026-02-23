import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildSalesSummary, formatSalesSummaryMessage } from './sales-summary'

/**
 * Generate a stock report for the Stock Manager agent.
 * Returns a Markdown-formatted string or null if nothing to report.
 */
export async function generateStockReport(storeId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase.from('stores').select('name').eq('id', storeId).single()

  if (!store) return null

  // Get global threshold
  const { data: alertConfig } = await supabase
    .from('store_stock_alerts')
    .select('threshold')
    .eq('store_id', storeId)
    .is('product_id', null)
    .single()

  const threshold = (alertConfig?.threshold as number) ?? 5

  // Get products below threshold
  const { data: products } = await supabase
    .from('store_products')
    .select('name, sku, stock_quantity')
    .eq('store_id', storeId)
    .eq('is_published', true)
    .lte('stock_quantity', threshold)
    .order('stock_quantity', { ascending: true })
    .limit(15)

  // Get total product count
  const { count: totalProducts } = await supabase
    .from('store_products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('is_published', true)

  const lowStockCount = products?.length ?? 0

  const lines: string[] = [
    `📦 *Stock Manager Report — ${store.name}*`,
    '',
    `Total products: ${totalProducts ?? 0}`,
    `Low stock (≤${threshold} units): ${lowStockCount}`,
  ]

  if (lowStockCount === 0) {
    lines.push('', 'All products are above the stock threshold.')
  } else {
    lines.push('')
    for (const p of products ?? []) {
      const sku = p.sku ? ` (${p.sku})` : ''
      lines.push(`• *${p.name}*${sku} — ${p.stock_quantity} units`)
    }
  }

  return lines.join('\n')
}

/**
 * Generate a price monitoring report for the Price Monitor agent.
 * Returns a Markdown-formatted string or null if nothing to report.
 */
export async function generatePriceReport(storeId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase.from('stores').select('name').eq('id', storeId).single()

  if (!store) return null

  const { data: monitors } = await supabase
    .from('store_price_monitors')
    .select('product_name, last_price, last_checked_at, is_active, url')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('last_checked_at', { ascending: false })

  const activeMonitors = monitors ?? []

  if (activeMonitors.length === 0) {
    return null // No active monitors, skip report
  }

  const lines: string[] = [
    `👀 *Price Monitor Report — ${store.name}*`,
    '',
    `Active monitors: ${activeMonitors.length}`,
    '',
  ]

  for (const m of activeMonitors) {
    const price = m.last_price ? `$${Number(m.last_price).toFixed(2)}` : 'not checked yet'
    const lastChecked = m.last_checked_at
      ? new Date(m.last_checked_at as string).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'never'
    lines.push(`• *${m.product_name}*: ${price} (checked: ${lastChecked})`)
  }

  return lines.join('\n')
}

/**
 * Generate a sales report for the Sales Analyst agent.
 * Returns a Markdown-formatted string or null if nothing to report.
 */
export async function generateSalesReport(storeId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase.from('stores').select('name').eq('id', storeId).single()

  if (!store) return null

  const summary = await buildSalesSummary(storeId)
  return formatSalesSummaryMessage(store.name, summary)
}
