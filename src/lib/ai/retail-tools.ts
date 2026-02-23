import { jsonSchema } from 'ai'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  createPriceMonitor,
  listPriceMonitors,
  deactivatePriceMonitor,
} from '@/lib/retail/price-monitors'

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
        'Update stock alert threshold or order notification settings. Use when user says "muda o alerta pra X unidades", "para de notificar pedidos", or "ativa notificação de pedidos".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          threshold: { type: 'number', description: 'New stock alert threshold' },
          product_name: {
            type: 'string',
            description: 'Optional: specific product to update (searches by name)',
          },
          order_notifications: {
            type: 'boolean',
            description:
              'Enable or disable Telegram notifications for new orders. true = enabled, false = disabled.',
          },
        },
      }),
      execute: async (params: {
        threshold?: number
        product_name?: string
        order_notifications?: boolean
      }) => {
        const supabase = getClient()

        // Handle order notification toggle
        if (params.order_notifications !== undefined) {
          const { data: store } = await supabase
            .from('stores')
            .select('settings')
            .eq('id', storeId)
            .single()

          const currentSettings = (store?.settings as Record<string, unknown> | null) ?? {}
          const { error } = await supabase
            .from('stores')
            .update({
              settings: {
                ...currentSettings,
                order_notifications_enabled: params.order_notifications,
              },
            })
            .eq('id', storeId)

          if (error) return { error: error.message }
          return {
            success: true,
            message: params.order_notifications
              ? 'New order notifications enabled.'
              : 'New order notifications disabled.',
          }
        }

        if (!params.threshold && params.threshold !== 0) {
          return {
            error:
              'Please provide a threshold or specify whether to enable/disable order notifications.',
          }
        }

        if (params.product_name) {
          // Find the product
          const { data: product } = await supabase
            .from('store_products')
            .select('id, name')
            .eq('store_id', storeId)
            .ilike('name', `%${params.product_name}%`)
            .limit(1)
            .single()

          if (!product) return { error: `Product "${params.product_name}" not found` }

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
            message: `Alert for ${product.name} updated to ${params.threshold} units`,
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
          message: `Global alert updated to ${params.threshold} units`,
        }
      },
    },

    STORE_UPDATE_SCHEDULE: {
      description:
        'Update the daily sales summary schedule. Use when user says "manda resumo às 20h", "quero receber resumo às 9 horas", "desativa o resumo diário", or similar.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          time: {
            type: 'string',
            description:
              'Time for the daily summary in BRT, e.g. "21:00", "9", "08:30". Only the hour is used.',
          },
          enabled: {
            type: 'boolean',
            description: 'Enable or disable the daily summary (default: true)',
          },
        },
        required: ['time'],
      }),
      execute: async (params: { time: string; enabled?: boolean }) => {
        const supabase = getClient()

        // Parse hour from time string (e.g. "21:00", "21", "9h")
        const hourMatch = params.time.match(/^(\d{1,2})/)
        if (!hourMatch) {
          return { error: 'Invalid time. Use a format like "21:00" or "9".' }
        }
        const hour = parseInt(hourMatch[1], 10)
        if (hour < 0 || hour > 23) {
          return { error: 'Invalid time. Must be between 0 and 23.' }
        }

        // Fetch current settings to merge
        const { data: store } = await supabase
          .from('stores')
          .select('settings')
          .eq('id', storeId)
          .single()

        const currentSettings = (store?.settings as Record<string, unknown> | null) ?? {}
        const enabled = params.enabled !== false // Default true

        const { error } = await supabase
          .from('stores')
          .update({
            settings: {
              ...currentSettings,
              daily_summary_hour: hour,
              daily_summary_enabled: enabled,
            },
          })
          .eq('id', storeId)

        if (error) return { error: error.message }

        const hourFormatted = String(hour).padStart(2, '0') + ':00'
        return {
          success: true,
          message: enabled
            ? `Daily summary scheduled for ${hourFormatted} (BRT).`
            : 'Daily summary disabled.',
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
            error: 'Your store is not connected to a platform. Connect it in Settings.',
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
            message: 'Sync started. Products will be updated shortly.',
          }
        } catch {
          return { error: 'Failed to start sync. Please try again.' }
        }
      },
    },

    STORE_MONITOR_PRICE: {
      description:
        'Create a competitor price monitor for a product. Use when user says "monitora o preço de X no link Y", "acompanha o preço do concorrente", or similar.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          product_name: {
            type: 'string',
            description: 'Name of the product to monitor (e.g. "Tênis Nike Air Max")',
          },
          competitor_url: {
            type: 'string',
            description: 'URL of the competitor product page to monitor',
          },
        },
        required: ['product_name', 'competitor_url'],
      }),
      execute: async (params: { product_name: string; competitor_url: string }) => {
        try {
          await createPriceMonitor(storeId, params.product_name, params.competitor_url)
          const all = await listPriceMonitors(storeId)
          const active = all.filter((m) => m.is_active)
          return {
            success: true,
            message: `Monitor created for *${params.product_name}*. You'll be notified when the price changes. You have ${active.length} active monitor(s) total.`,
          }
        } catch (err) {
          return {
            error: `Failed to create monitor: ${err instanceof Error ? err.message : String(err)}`,
          }
        }
      },
    },

    STORE_STOP_MONITOR: {
      description:
        'Deactivate a competitor price monitor. Use when user says "para de monitorar X", "cancela o monitor de preço", "remove o monitor", or similar.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          monitor_id: {
            type: 'string',
            description: 'ID of the monitor to deactivate (use if known)',
          },
          product_name: {
            type: 'string',
            description: 'Product name to search for and deactivate (fuzzy match)',
          },
        },
      }),
      execute: async (params: { monitor_id?: string; product_name?: string }) => {
        if (params.monitor_id) {
          await deactivatePriceMonitor(params.monitor_id)
          return { success: true, message: 'Monitor deactivated successfully.' }
        }

        const monitors = await listPriceMonitors(storeId)
        const active = monitors.filter((m) => m.is_active)

        if (params.product_name) {
          const lower = params.product_name.toLowerCase()
          const match = active.find((m) => m.product_name.toLowerCase().includes(lower))
          if (!match) {
            return {
              error: `No active monitor found for "${params.product_name}".`,
              active_monitors: active.map((m) => ({ id: m.id, product: m.product_name })),
            }
          }
          await deactivatePriceMonitor(match.id)
          return { success: true, message: `Monitor for *${match.product_name}* deactivated.` }
        }

        // Neither provided — list active monitors so user can pick
        if (active.length === 0) {
          return { message: 'No active price monitors at the moment.' }
        }

        return {
          message: 'Which monitor would you like to deactivate? Active monitors:',
          active_monitors: active.map((m) => ({
            id: m.id,
            product: m.product_name,
            url: m.url,
            current_price: m.last_price ? `R$ ${Number(m.last_price).toFixed(2)}` : '—',
          })),
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
