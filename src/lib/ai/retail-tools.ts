import { jsonSchema } from 'ai'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getComposio } from '@/lib/composio/client'
import type { Json } from '@/lib/supabase/database.types'

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

/**
 * Retail-specific tools for stores.
 * Added to the Telegram bot's tool set when the team has a store.
 */
export function buildRetailTools(
  storeId: string,
  teamId: string,
  supabaseClient?: SupabaseClient,
  userId?: string
) {
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
        'Trigger a manual product sync from the connected e-commerce platform (Shopify, etc). Use when user says "sincroniza meus produtos", "atualiza o estoque", or "sync products".',
      inputSchema: jsonSchema({ type: 'object', properties: {} }),
      execute: async () => {
        const supabase = getClient()

        // Check if store has a connected platform
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, team_id')
          .eq('id', storeId)
          .single()

        if (!store?.platform || store.platform === 'manual') {
          return {
            error: 'No e-commerce platform connected. Connect one in Settings > Store.',
          }
        }

        if (!store.platform_store_id) {
          return {
            error: `${store.platform} is selected but not fully connected. Go to Settings > Store to complete the connection.`,
          }
        }

        if (store.platform === 'shopify') {
          return await syncShopifyProducts(supabase, storeId, store.platform_store_id, userId)
        }

        return {
          error: `Sync is not yet supported for ${store.platform}. Only Shopify is currently available.`,
        }
      },
    },
  }
}

/**
 * Sync products from Shopify via Composio into store_products.
 */
async function syncShopifyProducts(
  supabase: SupabaseClient,
  storeId: string,
  connectedAccountId: string,
  ownerUserId?: string
): Promise<{
  success?: boolean
  message?: string
  error?: string
  products?: Array<{ name: string; sku?: string; price: number; stock: number; published: boolean }>
  total?: number
}> {
  try {
    const composio = getComposio()
    const slug = 'SHOPIFY_GET_PRODUCTS'

    // Look up tool version (required for manual execution)
    const tools = await composio.tools.getRawComposioTools({
      toolkits: ['shopify'],
      limit: 300,
    })
    const toolMeta = tools.find((t) => t.slug === slug)

    const result = (await composio.tools.execute(slug, {
      connectedAccountId,
      ...(ownerUserId ? { userId: ownerUserId } : {}),
      arguments: { limit: '250' },
      ...(toolMeta?.version ? { version: toolMeta.version } : {}),
    })) as { successful?: boolean; data?: Record<string, unknown>; error?: string }

    if (!result.successful) {
      return { error: result.error || 'Failed to fetch products from Shopify.' }
    }

    // Parse products from Composio response
    const data = result.data ?? {}
    const rawProducts = (data.products ?? data.items ?? data.data ?? []) as Array<
      Record<string, unknown>
    >

    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return { success: true, message: 'Shopify returned 0 products. Your store may be empty.' }
    }

    // Upsert into store_products
    let synced = 0
    for (const p of rawProducts) {
      const externalId = String(p.id ?? p.product_id ?? '')
      if (!externalId) continue

      const variants = Array.isArray(p.variants) ? p.variants : []
      const firstVariant = (variants[0] ?? {}) as Record<string, unknown>
      const totalStock = variants.reduce(
        (sum: number, v: Record<string, unknown>) => sum + (Number(v.inventory_quantity) || 0),
        0
      )

      const { error } = await supabase.from('store_products').upsert(
        {
          store_id: storeId,
          external_id: externalId,
          name: String(p.title ?? p.name ?? 'Unnamed'),
          sku: String(firstVariant.sku ?? p.sku ?? ''),
          price: Number(firstVariant.price ?? p.price ?? 0),
          stock_quantity: totalStock,
          variants: variants.map((v: Record<string, unknown>) => ({
            name: v.title,
            sku: v.sku,
            price: Number(v.price ?? 0),
            stock: Number(v.inventory_quantity ?? 0),
          })) as unknown as Json,
          images: (Array.isArray(p.images)
            ? (p.images as Array<Record<string, unknown>>).map((img) => String(img.src ?? ''))
            : []) as string[],
          is_published: p.status === 'active' || p.published_at != null,
        },
        { onConflict: 'store_id,external_id' }
      )

      if (!error) synced++
    }

    // Update last_sync_at
    await supabase
      .from('stores')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', storeId)

    // Return product summary so the AI can present the results immediately
    const { data: syncedProducts } = await supabase
      .from('store_products')
      .select('name, sku, price, stock_quantity, is_published')
      .eq('store_id', storeId)
      .order('name')
      .limit(20)

    return {
      success: true,
      message: `Synced ${synced} products from Shopify.`,
      products: (syncedProducts ?? []).map((p) => ({
        name: p.name,
        sku: p.sku || undefined,
        price: Number(p.price ?? 0),
        stock: p.stock_quantity,
        published: p.is_published,
      })),
      total: synced,
    }
  } catch (err) {
    return {
      error: `Sync failed: ${err instanceof Error ? err.message : String(err)}`,
    }
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
