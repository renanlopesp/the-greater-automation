import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging/telegram'

interface LowStockProduct {
  id: string
  name: string
  sku: string | null
  stock_quantity: number
  threshold: number
}

/**
 * Check all products for a store against their stock alert thresholds.
 * Uses per-product threshold if set, otherwise falls back to global threshold.
 * Respects cooldown period to avoid spamming.
 */
export async function checkStockAlerts(storeId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  // Get all enabled alerts for this store
  const { data: alerts } = await supabase
    .from('store_stock_alerts')
    .select('id, product_id, threshold, is_enabled, last_triggered_at, cooldown_minutes')
    .eq('store_id', storeId)
    .eq('is_enabled', true)

  if (!alerts || alerts.length === 0) return

  // Separate global alert (product_id is null) from per-product alerts
  const globalAlert = alerts.find((a) => !a.product_id)
  const productAlerts = new Map(
    alerts.filter((a) => a.product_id).map((a) => [a.product_id as string, a])
  )

  if (!globalAlert && productAlerts.size === 0) return

  // Get all published products for this store
  const { data: products } = await supabase
    .from('store_products')
    .select('id, name, sku, stock_quantity')
    .eq('store_id', storeId)
    .eq('is_published', true)

  if (!products) return

  const lowStockProducts: LowStockProduct[] = []
  const now = new Date()

  for (const product of products) {
    // Use per-product alert if exists, otherwise global
    const alert = productAlerts.get(product.id) ?? globalAlert
    if (!alert) continue

    const threshold = alert.threshold as number

    if ((product.stock_quantity as number) <= threshold) {
      // Check cooldown
      if (alert.last_triggered_at) {
        const lastTriggered = new Date(alert.last_triggered_at as string)
        const cooldownMs = ((alert.cooldown_minutes as number | null) ?? 60) * 60 * 1000
        if (now.getTime() - lastTriggered.getTime() < cooldownMs) continue
      }

      lowStockProducts.push({
        id: product.id as string,
        name: product.name as string,
        sku: (product.sku as string | null) ?? null,
        stock_quantity: product.stock_quantity as number,
        threshold,
      })
    }
  }

  if (lowStockProducts.length === 0) return

  // Send Telegram alert
  await sendStockAlert(storeId, lowStockProducts, supabase)

  // Update last_triggered_at on the alerts that fired
  // For global alert, update it once
  if (globalAlert) {
    await supabase
      .from('store_stock_alerts')
      .update({ last_triggered_at: now.toISOString() })
      .eq('id', globalAlert.id as string)
  }
  // For per-product alerts, update each that fired
  for (const product of lowStockProducts) {
    const productAlert = productAlerts.get(product.id)
    if (productAlert) {
      await supabase
        .from('store_stock_alerts')
        .update({ last_triggered_at: now.toISOString() })
        .eq('id', productAlert.id as string)
    }
  }
}

async function sendStockAlert(
  storeId: string,
  products: LowStockProduct[],
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<void> {
  // Find the store's team to get the Telegram chat
  const { data: store } = await supabase
    .from('stores')
    .select('team_id, name')
    .eq('id', storeId)
    .single()

  if (!store) return

  const { data: link } = await supabase
    .from('messaging_links')
    .select('external_chat_id')
    .eq('team_id', store.team_id as string)
    .eq('channel_type', 'telegram')
    .eq('is_verified', true)
    .single()

  if (!link?.external_chat_id) return

  const lines: string[] = ['⚠️ *Low Stock Alert*', '']

  for (const product of products.slice(0, 10)) {
    const skuInfo = product.sku ? ` (${product.sku})` : ''
    lines.push(
      `• *${product.name}*${skuInfo} — ${product.stock_quantity} units (threshold: ${product.threshold})`
    )
  }

  if (products.length > 10) {
    lines.push(`\n...and ${products.length - 10} more products with low stock.`)
  }

  lines.push('', 'Restock or adjust thresholds with: "set stock alert to X"')

  await sendMessage(link.external_chat_id as string, lines.join('\n'), 'Markdown')
}

/**
 * Check stock alert for a specific product (called after single product sync).
 */
export async function checkProductStockAlert(storeId: string, productId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  const { data: product } = await supabase
    .from('store_products')
    .select('id, name, sku, stock_quantity')
    .eq('id', productId)
    .single()

  if (!product) return

  // Get applicable alert (per-product or global)
  const { data: alerts } = await supabase
    .from('store_stock_alerts')
    .select('id, product_id, threshold, is_enabled, last_triggered_at, cooldown_minutes')
    .eq('store_id', storeId)
    .eq('is_enabled', true)
    .or(`product_id.eq.${productId},product_id.is.null`)

  const alert =
    alerts?.find((a) => a.product_id === productId) ?? alerts?.find((a) => !a.product_id)
  if (!alert) return

  const threshold = alert.threshold as number

  if ((product.stock_quantity as number) > threshold) return

  // Check cooldown
  if (alert.last_triggered_at) {
    const lastTriggered = new Date(alert.last_triggered_at as string)
    const cooldownMs = ((alert.cooldown_minutes as number | null) ?? 60) * 60 * 1000
    if (Date.now() - lastTriggered.getTime() < cooldownMs) return
  }

  await sendStockAlert(
    storeId,
    [
      {
        id: product.id as string,
        name: product.name as string,
        sku: (product.sku as string | null) ?? null,
        stock_quantity: product.stock_quantity as number,
        threshold,
      },
    ],
    supabase
  )

  await supabase
    .from('store_stock_alerts')
    .update({ last_triggered_at: new Date().toISOString() })
    .eq('id', alert.id as string)
}
