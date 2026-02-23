import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging/telegram'

export interface PriceMonitor {
  id: string
  product_name: string
  url: string | null
  last_price: number | null
  last_checked_at: string | null
  is_active: boolean
  marketplace: string
}

export async function createPriceMonitor(
  storeId: string,
  productName: string,
  competitorUrl: string,
  marketplace = 'other'
): Promise<PriceMonitor> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('store_price_monitors')
    .insert({
      store_id: storeId,
      product_name: productName,
      url: competitorUrl,
      marketplace,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create price monitor: ${error.message}`)
  return data as PriceMonitor
}

export async function listPriceMonitors(storeId: string): Promise<PriceMonitor[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('store_price_monitors')
    .select('id, product_name, url, last_price, last_checked_at, is_active, marketplace')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  return (data ?? []) as PriceMonitor[]
}

export async function deactivatePriceMonitor(monitorId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase.from('store_price_monitors').update({ is_active: false }).eq('id', monitorId)
}

export async function checkPriceMonitors(storeId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  const { data: monitors } = await supabase
    .from('store_price_monitors')
    .select('id, product_name, url, last_price, is_active')
    .eq('store_id', storeId)
    .eq('is_active', true)

  if (!monitors || monitors.length === 0) return

  const priceChanges: Array<{
    product_name: string
    old_price: number | null
    new_price: number
    url: string
  }> = []

  for (const monitor of monitors) {
    if (!monitor.url) continue
    try {
      const newPrice = await scrapePrice(monitor.url as string)
      if (newPrice === null) continue

      const oldPrice = monitor.last_price ? Number(monitor.last_price) : null

      await supabase
        .from('store_price_monitors')
        .update({
          last_price: newPrice,
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', monitor.id)

      // Detect price change (>1% difference to avoid float noise)
      if (oldPrice !== null && Math.abs(newPrice - oldPrice) / oldPrice > 0.01) {
        priceChanges.push({
          product_name: monitor.product_name as string,
          old_price: oldPrice,
          new_price: newPrice,
          url: monitor.url as string,
        })
      }
    } catch (err) {
      console.error(`[price-monitor] Error checking ${monitor.url}:`, err)
    }
  }

  if (priceChanges.length > 0) {
    await sendPriceChangeAlert(storeId, priceChanges)
  }
}

/**
 * Simple price scraper — extracts price from page using common patterns.
 * This is a basic implementation that works for many e-commerce sites.
 */
async function scrapePrice(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SnewBot/1.0)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return null

    const html = await response.text()

    // Try common price patterns in HTML
    const patterns = [
      // JSON-LD structured data
      /"price":\s*"?([\d.,]+)"?/,
      /"lowPrice":\s*"?([\d.,]+)"?/,
      // Meta tags
      /property="product:price:amount"\s+content="([\d.,]+)"/,
      /property="og:price:amount"\s+content="([\d.,]+)"/,
      // Common class patterns
      /class="[^"]*price[^"]*"[^>]*>[\s]*R?\$?\s*([\d.,]+)/i,
      /data-price="([\d.,]+)"/,
      // Nuvemshop-specific
      /itemprop="price"\s+content="([\d.,]+)"/,
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match?.[1]) {
        // Parse Brazilian format (1.234,56) or US format (1,234.56)
        let priceStr = match[1]
        // If has comma as decimal separator (Brazilian)
        if (priceStr.includes(',') && priceStr.indexOf(',') > priceStr.lastIndexOf('.')) {
          priceStr = priceStr.replace(/\./g, '').replace(',', '.')
        } else {
          priceStr = priceStr.replace(/,/g, '')
        }
        const price = parseFloat(priceStr)
        if (!isNaN(price) && price > 0) return price
      }
    }

    return null
  } catch {
    return null
  }
}

async function sendPriceChangeAlert(
  storeId: string,
  changes: Array<{ product_name: string; old_price: number | null; new_price: number; url: string }>
): Promise<void> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('team_id, name')
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

  const lines = ['🏷️ *Price Alert — Competitor*', '']

  for (const change of changes) {
    const arrow = change.old_price && change.new_price < change.old_price ? '📉' : '📈'
    const oldStr = change.old_price ? `$${change.old_price.toFixed(2)}` : '—'
    lines.push(`${arrow} *${change.product_name}*: ${oldStr} → $${change.new_price.toFixed(2)}`)
  }

  await sendMessage(link.external_chat_id as string, lines.join('\n'), 'Markdown')
}
