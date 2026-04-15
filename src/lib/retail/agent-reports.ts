/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — LEGACY SCHEMA DRIFT (spec 071)
// Reads store_price_monitors.own_product_id/product_name/previous_price/
// last_checked_at/marketplace which no longer exist in the current schema
// (price_monitors now uses product_id + last_price + competitor_url).

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
    `📦 *Relatório de Estoque — ${store.name}*`,
    '',
    `Total de produtos: ${totalProducts ?? 0}`,
    `Estoque baixo (≤${threshold} unidades): ${lowStockCount}`,
  ]

  if (lowStockCount === 0) {
    lines.push('', 'Todos os produtos estão acima do limite de estoque.')
  } else {
    lines.push('')
    for (const p of products ?? []) {
      const sku = p.sku ? ` (${p.sku})` : ''
      lines.push(`• *${p.name}*${sku} — ${p.stock_quantity} unidades`)
    }
  }

  return lines.join('\n')
}

/**
 * Generate a price monitoring report for the Price Monitor agent.
 * Now includes real price data from store_price_monitors.
 * Returns a Markdown-formatted string or null if nothing to report.
 */
export async function generatePriceReport(storeId: string): Promise<string | null> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('name, team_id')
    .eq('id', storeId)
    .single()

  if (!store) return null

  // Get price monitors with real data
  const { data: monitors } = await supabase
    .from('store_price_monitors')
    .select(
      'id, product_name, marketplace, last_price, previous_price, last_checked_at, is_active, price_changed_at, own_product_id'
    )
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('price_changed_at', { ascending: false, nullsFirst: false })

  // Also get agent workflows as fallback
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('team_id', store.team_id)
    .or('name.ilike.%price%,name.ilike.%vigia%,name.ilike.%monitor%')
    .limit(1)
    .single()

  const hasMonitors = monitors && monitors.length > 0

  if (!hasMonitors && !agent) return null

  const lines: string[] = [`👀 *Relatório de Preços — ${store.name}*`, '']

  if (hasMonitors) {
    lines.push(`Monitores ativos: ${monitors.length}`)
    lines.push('')

    // Get own product prices for comparison
    const ownProductIds = monitors.filter((m) => m.own_product_id).map((m) => m.own_product_id!)
    const ownPrices = new Map<string, number>()
    if (ownProductIds.length > 0) {
      const { data: ownProducts } = await supabase
        .from('store_products')
        .select('id, price')
        .in('id', ownProductIds)
      for (const p of ownProducts ?? []) {
        if (p.price) ownPrices.set(p.id, Number(p.price))
      }
    }

    for (const m of monitors) {
      const price = m.last_price ? `R$ ${Number(m.last_price).toFixed(2)}` : 'sem preço'
      let change = ''
      if (m.previous_price && m.last_price) {
        const diff =
          ((Number(m.last_price) - Number(m.previous_price)) / Number(m.previous_price)) * 100
        const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→'
        change = ` (${arrow}${Math.abs(diff).toFixed(1)}%)`
      }
      let ownComparison = ''
      if (m.own_product_id && m.last_price) {
        const ownPrice = ownPrices.get(m.own_product_id)
        if (ownPrice) {
          const diff = ((ownPrice - Number(m.last_price)) / Number(m.last_price)) * 100
          ownComparison =
            diff > 0
              ? ` | Seu: R$ ${ownPrice.toFixed(2)} (+${diff.toFixed(0)}%)`
              : ` | Seu: R$ ${ownPrice.toFixed(2)} (${diff.toFixed(0)}%)`
        }
      }
      const lastCheck = m.last_checked_at
        ? new Date(m.last_checked_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'nunca'
      lines.push(`• *${m.product_name}* (${m.marketplace}): ${price}${change}${ownComparison}`)
      lines.push(`  Última checagem: ${lastCheck}`)
    }
  } else if (agent) {
    // Fallback to workflow-based report
    const { data: workflows } = await supabase
      .from('agent_workflows')
      .select('name, is_enabled, last_run_at')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })

    const wfs = workflows ?? []
    if (wfs.length === 0) return null

    lines.push(`Automações de monitoramento: ${wfs.length}`)
    lines.push('')

    for (const wf of wfs) {
      const status = wf.is_enabled ? '✅' : '⏸️'
      const lastRun = wf.last_run_at
        ? new Date(wf.last_run_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'nunca'
      lines.push(`${status} *${wf.name}* — última execução: ${lastRun}`)
    }
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
