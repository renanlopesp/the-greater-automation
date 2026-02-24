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
 * Lists the agent's monitoring workflows with their status and last run time.
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

  // Find the price monitor agent for this team
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('team_id', store.team_id)
    .or('name.ilike.%price%,name.ilike.%vigia%,name.ilike.%monitor%')
    .limit(1)
    .single()

  if (!agent) return null

  // Get the agent's workflows
  const { data: workflows } = await supabase
    .from('agent_workflows')
    .select('name, is_enabled, last_run_at')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })

  const wfs = workflows ?? []

  if (wfs.length === 0) {
    return null // No workflows configured, skip report
  }

  const lines: string[] = [
    `👀 *Price Monitor Report — ${store.name}*`,
    '',
    `Monitoring workflows: ${wfs.length}`,
    '',
  ]

  for (const wf of wfs) {
    const status = wf.is_enabled ? '✅' : '⏸️'
    const lastRun = wf.last_run_at
      ? new Date(wf.last_run_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'never'
    lines.push(`${status} *${wf.name}* — last run: ${lastRun}`)
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
