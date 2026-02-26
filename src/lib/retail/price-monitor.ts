import { createServiceRoleClient } from '@/lib/supabase/server'

export interface PriceChangeResult {
  changed: boolean
  oldPrice: number | null
  newPrice: number
  changePct: number | null
  alert?: string
}

/**
 * Persist a scraped price to history and detect changes.
 */
export async function persistScrapedPrice(
  monitorId: string,
  extractedPrice: number
): Promise<PriceChangeResult> {
  const supabase = createServiceRoleClient()

  // Insert into price history
  await supabase.from('store_price_history').insert({
    monitor_id: monitorId,
    price: extractedPrice,
  })

  // Get current monitor state
  const { data: monitor } = await supabase
    .from('store_price_monitors')
    .select(
      'last_price, previous_price, alert_threshold_pct, product_name, marketplace, own_product_id, store_id'
    )
    .eq('id', monitorId)
    .single()

  if (!monitor) {
    return { changed: false, oldPrice: null, newPrice: extractedPrice, changePct: null }
  }

  const oldPrice = monitor.last_price ? Number(monitor.last_price) : null

  // Update monitor: shift last_price to previous_price
  await supabase
    .from('store_price_monitors')
    .update({
      previous_price: monitor.last_price,
      last_price: extractedPrice,
      last_checked_at: new Date().toISOString(),
      ...(oldPrice !== null && oldPrice !== extractedPrice
        ? { price_changed_at: new Date().toISOString() }
        : {}),
    })
    .eq('id', monitorId)

  if (oldPrice === null) {
    return { changed: false, oldPrice: null, newPrice: extractedPrice, changePct: null }
  }

  const changePct = oldPrice > 0 ? ((extractedPrice - oldPrice) / oldPrice) * 100 : null
  const threshold = Number(monitor.alert_threshold_pct ?? 5)
  const changed = changePct !== null && Math.abs(changePct) >= threshold

  let alert: string | undefined
  if (changed) {
    // Look up own price for comparison
    let ownPrice: number | null = null
    if (monitor.own_product_id) {
      const { data: ownProduct } = await supabase
        .from('store_products')
        .select('price')
        .eq('id', monitor.own_product_id)
        .single()
      ownPrice = ownProduct?.price ? Number(ownProduct.price) : null
    }

    alert = buildPriceChangeAlert(
      { product_name: monitor.product_name, marketplace: monitor.marketplace },
      oldPrice,
      extractedPrice,
      ownPrice
    )
  }

  return { changed, oldPrice, newPrice: extractedPrice, changePct, alert }
}

/**
 * Build a Telegram-formatted price change alert.
 */
export function buildPriceChangeAlert(
  monitor: { product_name: string; marketplace: string },
  oldPrice: number,
  newPrice: number,
  ownPrice?: number | null
): string {
  const changePct = ((newPrice - oldPrice) / oldPrice) * 100
  const direction = changePct > 0 ? '📈' : '📉'
  const sign = changePct > 0 ? '+' : ''

  const lines: string[] = [
    `${direction} *Mudança de Preço Detectada*`,
    '',
    `🏷️ ${monitor.product_name} — ${monitor.marketplace}`,
    `💰 R$ ${oldPrice.toFixed(2)} → R$ ${newPrice.toFixed(2)} (${sign}${changePct.toFixed(1)}%)`,
  ]

  if (ownPrice != null && ownPrice > 0) {
    const diff = ((ownPrice - newPrice) / newPrice) * 100
    if (diff > 0) {
      lines.push(`🏪 Seu preço: R$ ${ownPrice.toFixed(2)} (+${diff.toFixed(0)}% acima)`)
      lines.push('')
      lines.push('⚠️ Concorrente está mais barato!')
    } else {
      lines.push(`🏪 Seu preço: R$ ${ownPrice.toFixed(2)} (${diff.toFixed(0)}% abaixo)`)
      lines.push('')
      lines.push('✅ Seu preço está competitivo.')
    }
  }

  return lines.join('\n')
}

/**
 * Try to extract a numeric price from a text string.
 * Handles formats like "R$ 89,90", "89.90", "$89.90", etc.
 */
export function extractPriceFromText(text: string): number | null {
  // Try common patterns
  const patterns = [
    /R\$\s*([\d.,]+)/i,
    /(\d{1,3}(?:\.\d{3})*,\d{2})/, // 1.234,56 (BR format)
    /(\d+[.,]\d{2})/, // 89.90 or 89,90
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      let priceStr = match[1]
      // Handle BR format: 1.234,56 → 1234.56
      if (priceStr.includes(',') && priceStr.includes('.')) {
        priceStr = priceStr.replace(/\./g, '').replace(',', '.')
      } else if (priceStr.includes(',')) {
        priceStr = priceStr.replace(',', '.')
      }
      const price = parseFloat(priceStr)
      if (!isNaN(price) && price > 0) return price
    }
  }

  return null
}
