import { jsonSchema } from 'ai'
import { createServiceRoleClient } from '@/lib/supabase/server'

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

/**
 * Retail-specific tools for stores.
 * Added to the Telegram bot's tool set when the team has a store.
 */
export function buildRetailTools(storeId: string, teamId: string, supabaseClient?: SupabaseClient) {
  const getClient = () => supabaseClient ?? createServiceRoleClient()

  return {
    STORE_QUERY_STOCK: {
      description:
        'Query product stock levels. Search by product name, SKU, or get all products with low stock. Use this when the user asks about inventory, stock, or "como ta meu estoque?".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search by product name or SKU' },
          low_stock_only: {
            type: 'boolean',
            description: 'Only show products with stock <= alert threshold (default: false)',
          },
          limit: { type: 'number', description: 'Max results (default: 20)' },
        },
      }),
      execute: async (params: { search?: string; low_stock_only?: boolean; limit?: number }) => {
        const supabase = getClient()
        let query = supabase
          .from('store_products')
          .select('id, name, sku, price, stock_quantity, variants, is_published')
          .eq('store_id', storeId)
          .order('stock_quantity', { ascending: true })
          .limit(params.limit ?? 20)

        if (params.search) {
          query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`)
        }

        if (params.low_stock_only) {
          // Get the global threshold
          const { data: alertConfig } = await supabase
            .from('store_stock_alerts')
            .select('threshold')
            .eq('store_id', storeId)
            .is('product_id', null)
            .single()

          const threshold = alertConfig?.threshold ?? 5
          query = query.lte('stock_quantity', threshold)
        }

        const { data, error } = await query
        if (error) return { error: error.message }

        // Also get total product count
        const { count } = await supabase
          .from('store_products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', storeId)

        return {
          products: (data ?? []).map((p) => ({
            name: p.name,
            sku: p.sku,
            price: p.price,
            stock: p.stock_quantity,
            published: p.is_published,
            variants: Array.isArray(p.variants)
              ? (p.variants as Array<{ name?: string; stock?: number }>).map((v) => ({
                  name: v.name,
                  stock: v.stock,
                }))
              : [],
          })),
          total_products: count ?? 0,
          showing: data?.length ?? 0,
        }
      },
    },

    STORE_QUERY_SALES: {
      description:
        'Get sales summary for a date range. Shows order count, revenue, and top products. Use this when the user asks about sales, revenue, or "quanto vendi?".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'yesterday', 'this_week', 'this_month'],
            description: 'Time period for the summary (default: today)',
          },
        },
      }),
      execute: async (params: { period?: string }) => {
        const supabase = getClient()

        // Calculate date range
        const now = new Date()
        let startDate: Date
        const endDate = now

        switch (params.period) {
          case 'yesterday': {
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 1)
            startDate.setHours(0, 0, 0, 0)
            const yesterdayEnd = new Date(startDate)
            yesterdayEnd.setHours(23, 59, 59, 999)
            // Query yesterday specifically
            const { data } = await supabase
              .from('store_orders')
              .select('total, items, status, payment_status')
              .eq('store_id', storeId)
              .gte('ordered_at', startDate.toISOString())
              .lte('ordered_at', yesterdayEnd.toISOString())
            return buildSalesSummary(data ?? [], 'yesterday')
          }
          case 'this_week':
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - startDate.getDay())
            startDate.setHours(0, 0, 0, 0)
            break
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          default: // today
            startDate = new Date(now)
            startDate.setHours(0, 0, 0, 0)
        }

        const { data } = await supabase
          .from('store_orders')
          .select('total, items, status, payment_status')
          .eq('store_id', storeId)
          .gte('ordered_at', startDate.toISOString())
          .lte('ordered_at', endDate.toISOString())

        return buildSalesSummary(data ?? [], params.period ?? 'today')
      },
    },

    STORE_LIST_ORDERS: {
      description:
        'List recent orders with optional status filter. Use when the user asks about orders or "meus pedidos".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['open', 'closed', 'cancelled'],
            description: 'Filter by order status',
          },
          limit: { type: 'number', description: 'Max results (default: 10)' },
        },
      }),
      execute: async (params: { status?: string; limit?: number }) => {
        const supabase = getClient()
        let query = supabase
          .from('store_orders')
          .select(
            'order_number, status, payment_status, total, currency, customer_name, items, ordered_at'
          )
          .eq('store_id', storeId)
          .order('ordered_at', { ascending: false })
          .limit(params.limit ?? 10)

        if (params.status) {
          query = query.eq('status', params.status)
        }

        const { data, error } = await query
        if (error) return { error: error.message }

        return {
          orders: (data ?? []).map((o) => ({
            number: o.order_number,
            status: o.status,
            payment: o.payment_status,
            total: `R$ ${Number(o.total).toFixed(2)}`,
            customer: o.customer_name,
            items_count: Array.isArray(o.items) ? o.items.length : 0,
            date: o.ordered_at,
          })),
          count: data?.length ?? 0,
        }
      },
    },

    STORE_UPDATE_ALERT: {
      description:
        'Update stock alert threshold. Can set global default or per-product threshold. Use when user says "muda o alerta pra X unidades".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          threshold: { type: 'number', description: 'New stock alert threshold' },
          product_name: {
            type: 'string',
            description: 'Optional: specific product to update (searches by name)',
          },
        },
        required: ['threshold'],
      }),
      execute: async (params: { threshold: number; product_name?: string }) => {
        const supabase = getClient()

        if (params.product_name) {
          // Find the product
          const { data: product } = await supabase
            .from('store_products')
            .select('id, name')
            .eq('store_id', storeId)
            .ilike('name', `%${params.product_name}%`)
            .limit(1)
            .single()

          if (!product) return { error: `Produto "${params.product_name}" não encontrado` }

          // Upsert per-product alert
          const { error } = await supabase.from('store_stock_alerts').upsert(
            {
              store_id: storeId,
              product_id: product.id,
              threshold: params.threshold,
              is_enabled: true,
            },
            { onConflict: 'store_id,product_id' }
          )

          if (error) return { error: error.message }
          return {
            success: true,
            message: `Alerta de ${product.name} atualizado para ${params.threshold} unidades`,
          }
        }

        // Update global threshold
        const { error } = await supabase.from('store_stock_alerts').upsert(
          {
            store_id: storeId,
            product_id: null,
            threshold: params.threshold,
            is_enabled: true,
          },
          { onConflict: 'store_id,product_id' }
        )

        if (error) return { error: error.message }
        return {
          success: true,
          message: `Alerta global atualizado para ${params.threshold} unidades`,
        }
      },
    },

    STORE_TRIGGER_SYNC: {
      description:
        'Trigger a manual product sync from the connected platform (Nuvemshop, etc). Use when user says "sincroniza meus produtos" or "atualiza o estoque".',
      inputSchema: jsonSchema({ type: 'object', properties: {} }),
      execute: async () => {
        const supabase = getClient()

        // Check if store has platform credentials
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_access_token, platform_store_id')
          .eq('id', storeId)
          .single()

        if (!store?.platform_access_token || !store?.platform_store_id) {
          return {
            error:
              'Sua loja não está conectada a uma plataforma. Conecte pelo painel em Configurações.',
          }
        }

        // Trigger sync via API (fire and forget — the API handles the actual sync)
        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : 'http://localhost:3000'

          await fetch(`${baseUrl}/api/nuvemshop/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-service-key': process.env.INTERNAL_SERVICE_KEY || '',
            },
            body: JSON.stringify({ store_id: storeId }),
          })

          return {
            success: true,
            message: 'Sincronização iniciada. Os produtos serão atualizados em alguns segundos.',
          }
        } catch {
          return { error: 'Falha ao iniciar sincronização. Tente novamente.' }
        }
      },
    },
  }
}

function buildSalesSummary(
  orders: Array<{ total: number; items: unknown; status: string; payment_status: string | null }>,
  period: string
) {
  const paidOrders = orders.filter((o) => o.payment_status === 'paid' || o.status === 'closed')
  const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0)

  // Count items sold by product name
  const productCounts: Record<string, { quantity: number; revenue: number }> = {}
  for (const order of paidOrders) {
    const items = Array.isArray(order.items)
      ? (order.items as Array<{ name?: string; quantity?: string; price?: string }>)
      : []
    for (const item of items) {
      const name = item.name || 'Unknown'
      const qty = Number(item.quantity) || 1
      const price = Number(item.price) || 0
      if (!productCounts[name]) productCounts[name] = { quantity: 0, revenue: 0 }
      productCounts[name].quantity += qty
      productCounts[name].revenue += price * qty
    }
  }

  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([name, stats]) => ({ name, quantity: stats.quantity, revenue: stats.revenue }))

  return {
    period,
    orders_count: orders.length,
    paid_orders: paidOrders.length,
    revenue: `R$ ${revenue.toFixed(2)}`,
    revenue_raw: revenue,
    top_products: topProducts,
  }
}
