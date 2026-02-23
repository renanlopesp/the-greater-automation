import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging/telegram'

interface SalesSummary {
  date: string
  ordersCount: number
  revenue: number
  currency: string
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  comparison?: {
    ordersCount: number
    revenue: number
    changePercent: number
  }
}

/**
 * Build sales summary for a specific date.
 */
export async function buildSalesSummary(storeId: string, date?: string): Promise<SalesSummary> {
  const supabase = createServiceRoleClient()
  const targetDate = date ?? new Date().toISOString().split('T')[0]

  // Get orders for target date
  const startOfDay = `${targetDate}T00:00:00.000Z`
  const endOfDay = `${targetDate}T23:59:59.999Z`

  const { data: orders } = await supabase
    .from('store_orders')
    .select('total, currency, items, ordered_at')
    .eq('store_id', storeId)
    .gte('ordered_at', startOfDay)
    .lte('ordered_at', endOfDay)

  const ordersCount = orders?.length ?? 0
  const revenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0
  const currency = orders?.[0]?.currency ?? 'BRL'

  // Calculate top products from order items
  const productSales = new Map<string, { quantity: number; revenue: number }>()
  for (const order of orders ?? []) {
    const items = order.items as Array<{ name: string; quantity: number; price: number }> | null
    if (!items) continue
    for (const item of items) {
      const existing = productSales.get(item.name) ?? { quantity: 0, revenue: 0 }
      existing.quantity += item.quantity
      existing.revenue += item.price * item.quantity
      productSales.set(item.name, existing)
    }
  }

  const topProducts = Array.from(productSales.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Get yesterday's data for comparison
  const yesterday = new Date(targetDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const yesterdayStart = `${yesterdayStr}T00:00:00.000Z`
  const yesterdayEnd = `${yesterdayStr}T23:59:59.999Z`

  const { data: yesterdayOrders } = await supabase
    .from('store_orders')
    .select('total')
    .eq('store_id', storeId)
    .gte('ordered_at', yesterdayStart)
    .lte('ordered_at', yesterdayEnd)

  const yesterdayCount = yesterdayOrders?.length ?? 0
  const yesterdayRevenue = yesterdayOrders?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0

  const comparison = {
    ordersCount: yesterdayCount,
    revenue: yesterdayRevenue,
    changePercent:
      yesterdayRevenue > 0
        ? ((revenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : revenue > 0
          ? 100
          : 0,
  }

  return { date: targetDate, ordersCount, revenue, currency, topProducts, comparison }
}

/**
 * Format sales summary as a Telegram message.
 */
export function formatSalesSummaryMessage(storeName: string, summary: SalesSummary): string {
  const fmt = (v: number) => formatCurrency(v, summary.currency)
  const lines: string[] = [
    `📊 *Sales Summary — ${storeName}*`,
    `📅 ${formatDate(summary.date)}`,
    '',
  ]

  if (summary.ordersCount === 0) {
    lines.push('No sales recorded today.')
  } else {
    lines.push(`🛒 *${summary.ordersCount}* order${summary.ordersCount > 1 ? 's' : ''}`)
    lines.push(`💰 *${fmt(summary.revenue)}* in revenue`)

    if (summary.topProducts.length > 0) {
      lines.push('')
      lines.push('*Top products:*')
      for (const product of summary.topProducts) {
        lines.push(`• ${product.name} — ${product.quantity}x (${fmt(product.revenue)})`)
      }
    }
  }

  if (summary.comparison) {
    lines.push('')
    const change = summary.comparison.changePercent
    const arrow = change > 0 ? '📈' : change < 0 ? '📉' : '➡️'
    const sign = change > 0 ? '+' : ''
    lines.push(
      `${arrow} ${sign}${change.toFixed(1)}% vs. yesterday (${fmt(summary.comparison.revenue)})`
    )
  }

  return lines.join('\n')
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00Z')
  return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatCurrency(value: number, currency: string): string {
  if (currency === 'BRL') return `R$ ${value.toFixed(2)}`
  if (currency === 'USD') return `$ ${value.toFixed(2)}`
  return `${currency} ${value.toFixed(2)}`
}

/**
 * Send daily sales summary to a store's linked Telegram.
 */
export async function sendDailySummary(storeId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('name, team_id')
    .eq('id', storeId)
    .single()

  if (!store) return

  const { data: link } = await supabase
    .from('messaging_links')
    .select('external_chat_id')
    .eq('team_id', store.team_id)
    .eq('channel_type', 'telegram')
    .eq('is_verified', true)
    .single()

  if (!link?.external_chat_id) return

  const summary = await buildSalesSummary(storeId)
  const message = formatSalesSummaryMessage(store.name, summary)
  await sendMessage(link.external_chat_id, message, 'Markdown')
}
