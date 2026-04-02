import { jsonSchema } from 'ai'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getComposio } from '@/lib/composio/client'
import type { Json } from '@/lib/supabase/database.types'

type SupabaseClient = ReturnType<typeof createServiceRoleClient>

function normalizeAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Calculate quintile scores (1-5) for an array of numeric values.
 * Higher values get higher scores. Used for RFM scoring.
 */
function calculateQuintiles(values: number[], higherIsBetter = true): number[] {
  if (values.length === 0) return []
  if (values.length === 1) return [3] // mid score for single value

  // Create indexed pairs, sort by value
  const indexed = values.map((v, i) => ({ v, i }))
  indexed.sort((a, b) => a.v - b.v)

  const scores = new Array<number>(values.length)
  const n = values.length

  for (let rank = 0; rank < n; rank++) {
    // Quintile bucket 0-4, map to score 1-5
    const bucket = Math.min(Math.floor((rank / n) * 5), 4)
    const score = higherIsBetter ? bucket + 1 : 5 - bucket
    scores[indexed[rank].i] = score
  }

  return scores
}

/**
 * Map RFM scores (1-5 each) to a customer segment label.
 */
function mapRfmSegment(r: number, f: number, m: number): string {
  // New: single order + recent
  if (f === 1 && r >= 4) return 'New'
  // VIP: high across all dimensions
  if (r >= 4 && f >= 4 && m >= 4) return 'VIP'
  // At Risk: was valuable but hasn't bought recently
  if (r <= 2 && (f >= 3 || m >= 3)) return 'At Risk'
  // Lost: very low recency regardless of other scores
  if (r <= 2) return 'Lost'
  // Promising: recent, low frequency, decent monetary
  if (r >= 4 && f <= 2 && m >= 3) return 'Promising'
  // Loyal: consistent across dimensions (not VIP-level)
  if (r >= 3 && f >= 3 && m >= 3) return 'Loyal'
  // Promising: recent but still building frequency
  if (r >= 4 && f <= 2) return 'Promising'
  // Default: Loyal for moderate scores
  return 'Loyal'
}

/**
 * Calculate repurchase interval and overdue status from a list of order dates.
 * Returns null if fewer than 2 orders (can't calculate interval).
 */
function calculateRepurchaseData(
  orderDates: string[]
): { avgInterval: number; daysSinceLast: number; daysOverdue: number } | null {
  if (orderDates.length < 2) return null

  const sorted = orderDates.map((d) => new Date(d).getTime()).sort((a, b) => a - b)
  const intervals: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24))
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const daysSinceLast = (Date.now() - sorted[sorted.length - 1]) / (1000 * 60 * 60 * 24)
  const daysOverdue = daysSinceLast - avgInterval * 1.2

  return {
    avgInterval: Math.round(avgInterval),
    daysSinceLast: Math.round(daysSinceLast),
    daysOverdue: Math.round(daysOverdue),
  }
}

/**
 * Retail-specific tools for stores.
 * Added to the Telegram bot's tool set when the team has a store.
 */
export function buildRetailTools(
  storeId: string,
  teamId: string,
  supabaseClient?: SupabaseClient,
  userId?: string,
  imageAttachments?: Array<{ url: string; mediaType: string }>
) {
  const getClient = () => supabaseClient ?? createServiceRoleClient()

  return {
    STORE_QUERY_STOCK: {
      description:
        'Query product stock levels. Search by product name, SKU, or get all products with low stock. Queries the store API directly for fresh data. Use this when the user asks about inventory, stock, or "como ta meu estoque?".',
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
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          const allProducts = await client.getAllProducts()

          // Get low stock threshold from DB
          let threshold = 5
          if (params.low_stock_only) {
            const { data: alertConfig } = await supabase
              .from('store_stock_alerts')
              .select('threshold')
              .eq('store_id', storeId)
              .is('product_id', null)
              .single()
            threshold = alertConfig?.threshold ?? 5
          }

          // Map products with stock info
          let products = allProducts.map((p) => {
            const name = p.name?.pt ?? p.name?.es ?? p.name?.en ?? 'Sem nome'
            const totalStock = p.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
            const mainSku = p.variants[0]?.sku ?? null
            const mainPrice = p.variants[0]?.price ?? null
            return {
              id: p.id,
              name,
              sku: mainSku,
              price: mainPrice,
              stock: totalStock,
              published: p.published,
              variants: p.variants.map((v) => ({
                name:
                  v.name || v.values.map((val) => val.pt ?? val.en ?? '').join(' / ') || undefined,
                sku: v.sku,
                stock: v.stock ?? 0,
                price: v.price,
              })),
            }
          })

          // Apply search filter (accent-insensitive)
          if (params.search) {
            const needle = normalizeAccents(params.search)
            products = products.filter(
              (p) =>
                normalizeAccents(p.name).includes(needle) ||
                (p.sku && normalizeAccents(p.sku).includes(needle))
            )
          }

          // Apply low stock filter
          if (params.low_stock_only) {
            products = products.filter((p) => p.stock <= threshold)
          }

          // Sort by stock ascending (lowest first)
          products.sort((a, b) => a.stock - b.stock)

          const totalCount = products.length
          const limited = products.slice(0, params.limit ?? 20)

          // Enrich with cost_price and margin from DB
          const externalIds = limited.map((p) => String(p.id))
          const { data: dbProducts } = await supabase
            .from('store_products')
            .select('external_id, cost_price')
            .eq('store_id', storeId)
            .in('external_id', externalIds)
          const costMap = new Map<string, number>()
          for (const dp of dbProducts ?? []) {
            if (dp.cost_price != null) costMap.set(dp.external_id, Number(dp.cost_price))
          }

          const enriched = limited.map((p) => {
            const cost = costMap.get(String(p.id))
            const price = p.price ? parseFloat(p.price) : null
            return {
              ...p,
              cost_price: cost ?? null,
              margin_pct:
                cost != null && price != null && price > 0
                  ? Math.round(((price - cost) / price) * 1000) / 10
                  : null,
            }
          })

          return {
            products: enriched,
            total_products: allProducts.length,
            matching: totalCount,
            showing: enriched.length,
          }
        } catch (err) {
          return { error: err instanceof Error ? err.message : 'Failed to query stock from API' }
        }
      },
    },

    STORE_QUERY_SALES: {
      description:
        'Get sales summary for a time period. Shows order count, revenue, average ticket, and top products. Queries the store API directly for fresh data. Use this when the user asks about sales, revenue, ticket médio, or "quanto vendi?". Supports both preset periods AND custom date ranges (e.g., "maio de 2025").',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'yesterday', 'this_week', 'this_month', 'custom'],
            description:
              'Time period. Use "custom" with start_date/end_date for historical queries (default: today)',
          },
          start_date: {
            type: 'string',
            description:
              'Start date in YYYY-MM-DD format. Required when period is "custom". Example: "2025-05-01"',
          },
          end_date: {
            type: 'string',
            description:
              'End date in YYYY-MM-DD format. Required when period is "custom". Example: "2025-05-31"',
          },
        },
      }),
      execute: async (params: { period?: string; start_date?: string; end_date?: string }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        // Calculate date range
        const now = new Date()
        let startDate: Date
        let endDate: Date = now

        switch (params.period) {
          case 'custom': {
            if (!params.start_date || !params.end_date) {
              return {
                error: 'start_date and end_date are required for custom period (YYYY-MM-DD format)',
              }
            }
            startDate = new Date(params.start_date + 'T00:00:00')
            endDate = new Date(params.end_date + 'T23:59:59')
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              return { error: 'Invalid date format. Use YYYY-MM-DD.' }
            }
            break
          }
          case 'yesterday': {
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 1)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(startDate)
            endDate.setHours(23, 59, 59, 999)
            break
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

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          // Fetch all orders in the period (paginate)
          const allOrders: Array<{
            total: string
            status: string
            payment_status: string
            products: Array<{ name: string; quantity: string; price: string }>
            created_at: string
          }> = []
          let page = 1
          while (true) {
            const orders = await client.getOrders(page, 200, {
              created_at_min: startDate.toISOString(),
              created_at_max: endDate.toISOString(),
            })
            for (const o of orders) {
              {
                allOrders.push({
                  total: o.total ?? '0',
                  status: o.status ?? 'open',
                  payment_status: o.payment_status ?? 'pending',
                  products: (o.products ?? []).map((p) => ({
                    name: p.name ?? 'Produto',
                    quantity: String(p.quantity ?? '1'),
                    price: p.price ?? '0',
                  })),
                  created_at: o.created_at,
                })
              }
            }
            if (orders.length < 200) break
            page++
          }

          return buildSalesSummary(
            allOrders.map((o) => ({
              total: parseFloat(o.total),
              items: o.products.map((p) => ({
                name: p.name,
                quantity: p.quantity,
                price: p.price,
              })),
              status: o.status,
              payment_status: o.payment_status,
            })),
            params.period === 'custom'
              ? `${params.start_date} a ${params.end_date}`
              : (params.period ?? 'today')
          )
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_LIST_ORDERS: {
      description:
        'List recent orders with optional status filter. Queries the store API directly for fresh data. Use when the user asks about orders or "meus pedidos".',
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
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
          const limit = params.limit ?? 10
          const orders = await client.getOrders(
            1,
            limit,
            params.status ? { status: params.status } : undefined
          )

          return {
            orders: orders.map((o) => ({
              number: o.number ?? String(o.id),
              status: o.status,
              payment: o.payment_status,
              total: `R$ ${parseFloat(o.total ?? '0').toFixed(2)}`,
              currency: o.currency ?? 'BRL',
              customer: o.customer?.name ?? 'Anônimo',
              items_count: o.products?.length ?? 0,
              date: o.created_at,
            })),
            count: orders.length,
          }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
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

    STORE_DELETE_PRODUCT: {
      description:
        'Delete specific products from the store (both the e-commerce platform and local database). IMPORTANT: Always use product_ids for precise deletion. First use STORE_QUERY_STOCK to list products with their IDs, then pass the exact IDs of the products to delete. Only use search as a fallback when you do not have IDs.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          product_ids: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Array of product IDs (from STORE_QUERY_STOCK) to delete. This is the preferred way to delete — always use this when you have the IDs.',
          },
          search: {
            type: 'string',
            description:
              'Fallback: search by product name. Only use when you do not have product IDs. Will fail if multiple products match to prevent accidental mass deletion.',
          },
        },
      }),
      execute: async (params: { product_ids?: string[]; search?: string }) => {
        const supabase = getClient()

        let productsToDelete: Array<{ id: string; name: string; external_id: string | null }>

        if (params.product_ids && params.product_ids.length > 0) {
          // Precise deletion by ID
          const { data, error } = await supabase
            .from('store_products')
            .select('id, name, external_id')
            .eq('store_id', storeId)
            .in('id', params.product_ids)

          if (error) return { error: error.message }
          if (!data || data.length === 0)
            return { error: 'None of the provided product IDs were found' }
          productsToDelete = data
        } else if (params.search) {
          // Fallback: name search — only allow single match to prevent accidents
          const { data, error } = await supabase
            .from('store_products')
            .select('id, name, external_id')
            .eq('store_id', storeId)
            .ilike('name', `%${params.search}%`)

          if (error) return { error: error.message }
          if (!data || data.length === 0)
            return { error: `No products found matching "${params.search}"` }
          if (data.length > 1) {
            return {
              error: `Found ${data.length} products matching "${params.search}". Use STORE_QUERY_STOCK first to get exact IDs, then pass them via product_ids to delete specific ones.`,
              matches: data.map((p) => ({ id: p.id, name: p.name })),
            }
          }
          productsToDelete = data
        } else {
          return { error: 'Provide either product_ids or search parameter' }
        }

        // Get store credentials for platform deletion
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        const deleted: string[] = []
        const errors: string[] = []

        for (const product of productsToDelete) {
          try {
            // Delete from platform if connected and product has external_id
            if (
              product.external_id &&
              store?.platform === 'nuvemshop' &&
              store.platform_store_id &&
              store.platform_access_token
            ) {
              const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
              const client = new NuvemshopClient(
                store.platform_store_id,
                store.platform_access_token
              )
              await client.deleteProduct(parseInt(product.external_id, 10))
            }

            // Delete from local DB
            const { error: delError } = await supabase
              .from('store_products')
              .delete()
              .eq('id', product.id)

            if (delError) {
              errors.push(`${product.name}: ${delError.message}`)
            } else {
              deleted.push(product.name)
            }
          } catch (err) {
            errors.push(`${product.name}: ${err instanceof Error ? err.message : String(err)}`)
          }
        }

        return {
          success: deleted.length > 0,
          deleted,
          errors: errors.length > 0 ? errors : undefined,
          message: `Deleted ${deleted.length} product(s)${errors.length > 0 ? `, ${errors.length} failed` : ''}.`,
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

        if (store.platform === 'nuvemshop') {
          return await syncNuvemshopProducts(supabase, storeId)
        }

        return {
          error: `Sync is not yet supported for ${store.platform}. Shopify and Nuvemshop are currently available.`,
        }
      },
    },

    STORE_UPDATE_PRODUCT: {
      description:
        'Update a product in the store (name, price, description, stock, published status). Use when user says "muda o nome do produto", "atualiza o preço", "despublica produto", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search by product name to find the product to update',
          },
          name: { type: 'string', description: 'New product name' },
          price: { type: 'string', description: 'New price (e.g. "29.90")' },
          stock: { type: 'number', description: 'New stock quantity (updates all variants)' },
          description: { type: 'string', description: 'New product description' },
          published: { type: 'boolean', description: 'Publish or unpublish the product' },
        },
        required: ['search'],
      }),
      execute: async (params: {
        search: string
        name?: string
        price?: string
        stock?: number
        description?: string
        published?: boolean
      }) => {
        const supabase = getClient()

        let { data: products } = await supabase
          .from('store_products')
          .select('id, name, external_id, variants')
          .eq('store_id', storeId)
          .ilike('name', `%${params.search}%`)
          .limit(5)

        // If ILIKE found nothing, fallback to accent-insensitive search in JS
        if (!products || products.length === 0) {
          const { data: allProducts } = await supabase
            .from('store_products')
            .select('id, name, external_id, variants')
            .eq('store_id', storeId)
            .limit(50)

          const needle = normalizeAccents(params.search)
          const matched = (allProducts ?? []).filter((p) =>
            normalizeAccents(p.name).includes(needle)
          )
          if (matched.length === 1) {
            products = matched
          } else if (matched.length > 1) {
            return {
              error: `Found ${matched.length} products. Be more specific.`,
              matches: matched.map((p) => p.name),
            }
          }
        }

        if (!products || products.length === 0) {
          return { error: `No products found matching "${params.search}"` }
        }
        if (products.length > 1) {
          return {
            error: `Found ${products.length} products. Be more specific.`,
            matches: products.map((p) => p.name),
          }
        }

        const product = products[0]
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        try {
          if (
            product.external_id &&
            store?.platform === 'nuvemshop' &&
            store.platform_store_id &&
            store.platform_access_token
          ) {
            const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
            const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
            const externalId = parseInt(product.external_id, 10)

            // Update product fields on platform
            const updateData: Record<string, unknown> = {}
            if (params.name) updateData.name = { pt: params.name }
            if (params.description) updateData.description = { pt: params.description }
            if (params.published !== undefined) updateData.published = params.published

            if (Object.keys(updateData).length > 0) {
              await client.updateProduct(
                externalId,
                updateData as Parameters<typeof client.updateProduct>[1]
              )
            }

            // Update price/stock on variants
            if (params.price !== undefined || params.stock !== undefined) {
              const variants = await client.getVariants(externalId)
              for (const v of variants) {
                const variantUpdate: Record<string, unknown> = {}
                if (params.price !== undefined) variantUpdate.price = params.price
                if (params.stock !== undefined) variantUpdate.stock = params.stock
                if (Object.keys(variantUpdate).length > 0) {
                  await client.updateVariant(
                    externalId,
                    v.id,
                    variantUpdate as Parameters<typeof client.updateVariant>[2]
                  )
                }
              }
            }
          }

          // Update local DB
          const localUpdate: Record<string, unknown> = {}
          if (params.name) localUpdate.name = params.name
          if (params.price !== undefined) localUpdate.price = parseFloat(params.price)
          if (params.stock !== undefined) localUpdate.stock_quantity = params.stock
          if (params.published !== undefined) localUpdate.is_published = params.published

          if (Object.keys(localUpdate).length > 0) {
            await supabase.from('store_products').update(localUpdate).eq('id', product.id)
          }

          return { success: true, message: `Product "${product.name}" updated.` }
        } catch (err) {
          return { error: `Update failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_CREATE_PRODUCT: {
      description:
        'Create a new product in the store. Use when user asks to add or create a product. The product is created both on the e-commerce platform and locally.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Product name' },
          price: { type: 'string', description: 'Product price (e.g. "49.90")' },
          stock: { type: 'number', description: 'Initial stock quantity (default: 0)' },
          description: { type: 'string', description: 'Product description' },
          sku: { type: 'string', description: 'Product SKU' },
          published: { type: 'boolean', description: 'Publish immediately (default: true)' },
        },
        required: ['name', 'price'],
      }),
      execute: async (params: {
        name: string
        price: string
        stock?: number
        description?: string
        sku?: string
        published?: boolean
      }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        try {
          let externalId: string | null = null

          if (
            store?.platform === 'nuvemshop' &&
            store.platform_store_id &&
            store.platform_access_token
          ) {
            const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
            const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
            const created = await client.createProduct({
              name: { pt: params.name },
              description: params.description ? { pt: params.description } : undefined,
              variants: [
                {
                  price: params.price,
                  stock: params.stock ?? 0,
                  stock_management: true,
                  sku: params.sku,
                },
              ],
              published: params.published !== false,
            })
            externalId = String(created.id)
          }

          // Create in local DB
          await supabase.from('store_products').insert({
            store_id: storeId,
            external_id: externalId ?? `local_${Date.now()}`,
            name: params.name,
            sku: params.sku ?? null,
            price: parseFloat(params.price),
            stock_quantity: params.stock ?? 0,
            is_published: params.published !== false,
            variants: [
              {
                name: 'Default',
                price: parseFloat(params.price),
                stock: params.stock ?? 0,
                sku: params.sku,
              },
            ],
            images: [],
          })

          return {
            success: true,
            message: `Product "${params.name}" created at R$ ${params.price} with ${params.stock ?? 0} units.`,
          }
        } catch (err) {
          return { error: `Create failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_QUERY_CATEGORIES: {
      description:
        'List product categories from the store. Use when user asks about categories, collections, or how products are organized.',
      inputSchema: jsonSchema({ type: 'object', properties: {} }),
      execute: async () => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
          const categories = await client.getCategories({ per_page: 100 })
          return {
            categories: categories.map((c) => ({
              id: c.id,
              name: c.name?.pt ?? c.name?.es ?? c.name?.en ?? 'Sem nome',
              parent: c.parent,
              subcategories: c.subcategories,
            })),
            total: categories.length,
          }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_MANAGE_CATEGORIES: {
      description:
        'Create or delete a product category. Use when user says "cria a categoria X", "deleta a categoria", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'delete'], description: 'Action to perform' },
          name: { type: 'string', description: 'Category name (for create)' },
          category_id: { type: 'number', description: 'Category ID (for delete)' },
          parent_id: { type: 'number', description: 'Parent category ID (for create, optional)' },
        },
        required: ['action'],
      }),
      execute: async (params: {
        action: string
        name?: string
        category_id?: number
        parent_id?: number
      }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          if (params.action === 'create') {
            if (!params.name) return { error: 'Category name is required' }
            const cat = await client.createCategory({
              name: { pt: params.name },
              parent: params.parent_id,
            })
            return { success: true, message: `Category "${params.name}" created (ID: ${cat.id}).` }
          }

          if (params.action === 'delete') {
            if (!params.category_id) return { error: 'Category ID is required for deletion' }
            await client.deleteCategory(params.category_id)
            return { success: true, message: `Category ${params.category_id} deleted.` }
          }

          return { error: `Unknown action: ${params.action}` }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_QUERY_CUSTOMERS: {
      description:
        'Search or list store customers sorted by total spent. Use when user asks about customers, buyers, top customers, "quem comprou?", "quantos clientes tenho?", "quem mais comprou?".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search by name, email, or identification' },
          email: { type: 'string', description: 'Search by exact email' },
          sort_by: {
            type: 'string',
            enum: ['total_spent'],
            description:
              'Sort customers by total_spent (descending). When set, fetches all customers to sort accurately.',
          },
          limit: { type: 'number', description: 'Max results (default: 20)' },
        },
      }),
      execute: async (params: {
        search?: string
        email?: string
        sort_by?: string
        limit?: number
      }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          let customers
          if (params.sort_by || (!params.search && !params.email)) {
            // Fetch all customers for sorting or general listing
            customers = await client.getAllCustomers()
          } else {
            customers = await client.getCustomers({
              q: params.search,
              email: params.email,
              per_page: params.limit ?? 20,
            })
          }

          // Apply search filter if fetched all
          if (params.search && (params.sort_by || (!params.search && !params.email))) {
            const needle = normalizeAccents(params.search)
            customers = customers.filter(
              (c) =>
                normalizeAccents(c.name).includes(needle) ||
                normalizeAccents(c.email).includes(needle)
            )
          }

          // Sort by total_spent descending by default when sort_by is set
          if (params.sort_by === 'total_spent') {
            customers.sort((a, b) => parseFloat(b.total_spent) - parseFloat(a.total_spent))
          }

          const limited = customers.slice(0, params.limit ?? 20)

          return {
            customers: limited.map((c) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              phone: c.phone,
              total_spent: c.total_spent,
              total_spent_currency: c.total_spent_currency,
            })),
            total_customers: customers.length,
            showing: limited.length,
          }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_MANAGE_COUPONS: {
      description:
        'List, create, or delete discount coupons. Use when user says "cria cupom", "meus cupons", "deleta o cupom X", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'create', 'delete'],
            description: 'Action to perform',
          },
          code: { type: 'string', description: 'Coupon code (for create)' },
          type: {
            type: 'string',
            enum: ['percentage', 'absolute', 'shipping'],
            description: 'Discount type (for create)',
          },
          value: { type: 'string', description: 'Discount value (e.g. "10" for 10% or R$10)' },
          coupon_id: { type: 'number', description: 'Coupon ID (for delete)' },
          max_uses: { type: 'number', description: 'Max uses (for create, optional)' },
          min_price: { type: 'string', description: 'Minimum order price (for create, optional)' },
          start_date: { type: 'string', description: 'Start date ISO 8601 (for create, optional)' },
          end_date: { type: 'string', description: 'End date ISO 8601 (for create, optional)' },
        },
        required: ['action'],
      }),
      execute: async (params: {
        action: string
        code?: string
        type?: 'percentage' | 'absolute' | 'shipping'
        value?: string
        coupon_id?: number
        max_uses?: number
        min_price?: string
        start_date?: string
        end_date?: string
      }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          if (params.action === 'list') {
            const coupons = await client.getCoupons({ per_page: 50 })
            return {
              coupons: coupons.map((c) => ({
                id: c.id,
                code: c.code,
                type: c.type,
                value: String(c.value ?? ''),
                valid: c.valid,
                used: c.used,
                max_uses: c.max_uses,
                start_date: c.start_date,
                end_date: c.end_date,
                min_price: c.min_price != null ? String(c.min_price) : null,
                includes_shipping: c.includes_shipping,
              })),
              total: coupons.length,
            }
          }

          if (params.action === 'create') {
            if (!params.code || !params.type)
              return { error: 'Code and type are required to create a coupon' }
            const coupon = await client.createCoupon({
              code: params.code,
              type: params.type,
              value: params.value,
              max_uses: params.max_uses,
              min_price: params.min_price,
              start_date: params.start_date,
              end_date: params.end_date,
            })
            return {
              success: true,
              coupon: {
                id: coupon.id,
                code: coupon.code,
                type: coupon.type,
                value: String(coupon.value ?? ''),
                valid: coupon.valid,
                max_uses: coupon.max_uses,
                start_date: coupon.start_date,
                end_date: coupon.end_date,
              },
              message: `Cupom "${coupon.code}" criado (${coupon.type}: ${coupon.value ?? 'frete grátis'}).`,
            }
          }

          if (params.action === 'delete') {
            if (!params.coupon_id) return { error: 'Coupon ID is required for deletion' }
            await client.deleteCoupon(params.coupon_id)
            return { success: true, message: `Coupon ${params.coupon_id} deleted.` }
          }

          return { error: `Unknown action: ${params.action}` }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_MANAGE_ORDERS: {
      description:
        'Manage orders: close, reopen, or cancel. Use when user says "fecha o pedido", "cancela pedido #X", "reabre o pedido", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['close', 'open', 'cancel'],
            description: 'Action to perform on the order',
          },
          order_number: {
            type: 'string',
            description: 'Order number to find (e.g. "#1234" or "1234")',
          },
          cancel_reason: {
            type: 'string',
            enum: ['customer', 'inventory', 'fraud', 'other'],
            description: 'Cancellation reason (required for cancel)',
          },
          restock: {
            type: 'boolean',
            description: 'Return inventory on cancellation (default: true)',
          },
        },
        required: ['action', 'order_number'],
      }),
      execute: async (params: {
        action: string
        order_number: string
        cancel_reason?: string
        restock?: boolean
      }) => {
        const supabase = getClient()

        // Find order in local DB first
        const orderNum = params.order_number.replace('#', '')
        const { data: orderRow } = await supabase
          .from('store_orders')
          .select('id, external_id, order_number, status')
          .eq('store_id', storeId)
          .eq('order_number', orderNum)
          .single()

        if (!orderRow?.external_id) {
          return { error: `Order #${orderNum} not found or has no external ID` }
        }

        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
          const externalId = parseInt(orderRow.external_id, 10)

          if (params.action === 'close') {
            await client.closeOrder(externalId)
            await supabase.from('store_orders').update({ status: 'closed' }).eq('id', orderRow.id)
            return { success: true, message: `Order #${orderNum} closed.` }
          }

          if (params.action === 'open') {
            await client.openOrder(externalId)
            await supabase.from('store_orders').update({ status: 'open' }).eq('id', orderRow.id)
            return { success: true, message: `Order #${orderNum} reopened.` }
          }

          if (params.action === 'cancel') {
            await client.cancelOrder(externalId, {
              reason: params.cancel_reason ?? 'other',
              restock: params.restock !== false,
            })
            await supabase
              .from('store_orders')
              .update({ status: 'cancelled' })
              .eq('id', orderRow.id)
            return { success: true, message: `Order #${orderNum} cancelled.` }
          }

          return { error: `Unknown action: ${params.action}` }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_GET_ABANDONED_CHECKOUTS: {
      description:
        'List abandoned checkouts (customers who started but didn\'t finish buying). Use when user asks about abandoned carts, "carrinhos abandonados", or recovery opportunities.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max results (default: 20)' },
        },
      }),
      execute: async (params: { limit?: number }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
          const checkouts = await client.getAbandonedCheckouts({ per_page: params.limit ?? 20 })
          // Get recovery stats from tracking table
          const { count: totalNotified } = await supabase
            .from('store_abandoned_cart_notifications')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId)
          const { count: totalRecovered } = await supabase
            .from('store_abandoned_cart_notifications')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId)
            .not('recovered_at', 'is', null)
          const recoveryRate =
            (totalNotified ?? 0) > 0
              ? Math.round(((totalRecovered ?? 0) / (totalNotified ?? 1)) * 100)
              : null

          return {
            abandoned_checkouts: checkouts.map((c) => ({
              id: c.id,
              customer_name: c.contact_name,
              customer_email: c.contact_email,
              total: c.total,
              currency: c.currency,
              products_count: c.products?.length ?? 0,
              recovery_url: c.abandoned_checkout_url,
              created_at: c.created_at,
            })),
            total: checkouts.length,
            recovery_stats: {
              total_notified: totalNotified ?? 0,
              total_recovered: totalRecovered ?? 0,
              recovery_rate_pct: recoveryRate,
            },
          }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_ADD_PRODUCT_IMAGE: {
      description:
        'Add an image to a product. The image is automatically taken from the file the user attached in this chat message — do NOT ask the user to provide base64 or a URL. Use when user says "coloca essa imagem no produto X", "adiciona foto", "sobe imagem", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search by product name to find the product',
          },
          image_url: {
            type: 'string',
            description:
              'Optional: HTTP URL of an image found in the conversation. Leave empty when the user attached a file — the tool picks it up automatically.',
          },
          position: {
            type: 'number',
            description: 'Image position/order (optional, default: 1)',
          },
        },
        required: ['search'],
      }),
      execute: async (params: { search: string; image_url?: string; position?: number }) => {
        const supabase = getClient()

        let { data: products } = await supabase
          .from('store_products')
          .select('id, name, external_id')
          .eq('store_id', storeId)
          .ilike('name', `%${params.search}%`)
          .limit(5)

        // If ILIKE found nothing, fallback to accent-insensitive search in JS
        if (!products || products.length === 0) {
          const { data: allProducts } = await supabase
            .from('store_products')
            .select('id, name, external_id')
            .eq('store_id', storeId)
            .limit(50)

          const needle = normalizeAccents(params.search)
          const matched = (allProducts ?? []).filter((p) =>
            normalizeAccents(p.name).includes(needle)
          )
          if (matched.length === 1) {
            products = matched
          } else if (matched.length > 1) {
            return {
              error: `Found ${matched.length} products. Be more specific.`,
              matches: matched.map((p) => p.name),
            }
          }
        }

        if (!products || products.length === 0) {
          return { error: `No products found matching "${params.search}"` }
        }
        if (products.length > 1) {
          return {
            error: `Found ${products.length} products. Be more specific.`,
            matches: products.map((p) => p.name),
          }
        }

        const product = products[0]
        if (!product.external_id) {
          return { error: 'Product has no external ID (not synced to platform)' }
        }

        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        // Resolve image source: prefer user attachment, fall back to image_url param
        const attachmentUrl = imageAttachments?.[0]?.url
        const rawImageSource = attachmentUrl ?? params.image_url

        if (!rawImageSource) {
          return {
            error: 'No image found. Please attach an image to your message.',
          }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
          const externalId = parseInt(product.external_id, 10)

          // Determine image format: data URL (base64) or HTTP URL
          let imagePayload: {
            src?: string
            attachment?: string
            filename?: string
            position?: number
          }

          if (rawImageSource.startsWith('data:')) {
            // Extract base64 from data URL: "data:image/png;base64,iVBOR..."
            const match = rawImageSource.match(/^data:([^;]+);base64,(.+)$/)
            if (!match) {
              return { error: 'Invalid data URL format' }
            }
            const mimeType = match[1]
            const base64 = match[2]
            const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
            imagePayload = {
              attachment: base64,
              filename: `product-image.${ext}`,
              position: params.position ?? 1,
            }
          } else {
            // HTTP URL
            imagePayload = { src: rawImageSource, position: params.position ?? 1 }
          }

          const image = await client.createImage(externalId, imagePayload)
          return {
            success: true,
            message: `Image added to "${product.name}".`,
            image_url: image.src,
          }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_MANAGE_DRAFT_ORDERS: {
      description:
        'Manage draft orders (manual orders created from WhatsApp, DM, phone). List, create, confirm, or delete. Use when user says "cria um pedido manual", "pedidos rascunho", "confirma o rascunho", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'create', 'confirm', 'delete'],
            description: 'Action to perform',
          },
          customer_name: { type: 'string', description: 'Customer first name (for create)' },
          customer_lastname: { type: 'string', description: 'Customer last name (for create)' },
          customer_email: { type: 'string', description: 'Customer email (for create)' },
          products: {
            type: 'string',
            description:
              'JSON array of products like \'[{"name":"Camiseta","quantity":1,"price":"49.90"}]\' (for create)',
          },
          draft_id: { type: 'string', description: 'Draft order ID (for confirm/delete)' },
        },
        required: ['action'],
      }),
      execute: async (params: {
        action: string
        customer_name?: string
        customer_lastname?: string
        customer_email?: string
        products?: string
        draft_id?: string
      }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          if (params.action === 'list') {
            const drafts = await client.getDraftOrders()
            return {
              draft_orders: drafts.map((d) => ({
                id: d.id,
                contact_name: `${d.contact_name} ${d.contact_lastname}`.trim(),
                payment_status: d.payment_status,
                total: d.total,
                currency: d.currency,
                created_at: d.created_at,
              })),
              total: drafts.length,
            }
          }

          if (params.action === 'create') {
            if (!params.customer_name || !params.customer_email || !params.products) {
              return {
                error: 'customer_name, customer_email, and products are required for create',
              }
            }
            const draft = await client.createDraftOrder({
              contact_name: params.customer_name,
              contact_lastname: params.customer_lastname ?? '',
              contact_email: params.customer_email,
              payment_status: 'pending_confirmation',
              products: JSON.parse(params.products),
            })
            return { success: true, message: `Draft order ${draft.id} created.`, id: draft.id }
          }

          if (params.action === 'confirm') {
            if (!params.draft_id) return { error: 'draft_id is required for confirm' }
            const order = await client.confirmDraftOrder(parseInt(params.draft_id))
            return {
              success: true,
              message: `Draft order confirmed. Order #${order.number} created.`,
            }
          }

          if (params.action === 'delete') {
            if (!params.draft_id) return { error: 'draft_id is required for delete' }
            await client.deleteDraftOrder(parseInt(params.draft_id))
            return { success: true, message: `Draft order ${params.draft_id} deleted.` }
          }

          return { error: `Unknown action: ${params.action}` }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_MANAGE_FULFILLMENT: {
      description:
        'Manage order shipping/fulfillment. Get what needs shipping, add tracking codes. Use when user says "o que preciso enviar?", "adiciona rastreio", "código de rastreamento", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['get', 'update_tracking'],
            description: 'Action to perform',
          },
          order_number: { type: 'string', description: 'Order number (required)' },
          tracking_number: { type: 'string', description: 'Tracking code (for update_tracking)' },
          tracking_url: { type: 'string', description: 'Tracking URL (for update_tracking)' },
          shipping_company: {
            type: 'string',
            description: 'Shipping carrier name (for update_tracking)',
          },
        },
        required: ['action', 'order_number'],
      }),
      execute: async (params: {
        action: string
        order_number: string
        tracking_number?: string
        tracking_url?: string
        shipping_company?: string
      }) => {
        const supabase = getClient()

        const orderNum = params.order_number.replace('#', '')
        const { data: orderRow } = await supabase
          .from('store_orders')
          .select('id, external_id, order_number, status')
          .eq('store_id', storeId)
          .eq('order_number', orderNum)
          .single()

        if (!orderRow?.external_id) {
          return { error: `Order #${orderNum} not found or has no external ID` }
        }

        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
          const externalId = parseInt(orderRow.external_id, 10)

          if (params.action === 'get') {
            const fulfillments = await client.getFulfillmentOrders(externalId)
            return {
              order_number: orderNum,
              fulfillments: fulfillments.map((f) => ({
                id: f.id,
                status: f.status,
                tracking_number: f.shipping?.tracking_number ?? null,
                tracking_url: f.shipping?.tracking_url ?? null,
                shipping_type: f.shipping?.type ?? null,
                line_items: f.line_items?.map((li) => ({
                  id: li.id,
                  name: li.name,
                  quantity: li.quantity,
                })),
              })),
            }
          }

          if (params.action === 'update_tracking') {
            if (!params.tracking_number)
              return { error: 'tracking_number is required for update_tracking' }
            const fulfillments = await client.getFulfillmentOrders(externalId)
            if (!fulfillments.length) return { error: 'No fulfillment orders found for this order' }
            const fulfillmentId = fulfillments[0].id
            await client.updateFulfillmentOrder(externalId, fulfillmentId, {
              tracking_number: params.tracking_number,
              tracking_url: params.tracking_url,
              shipping_company: params.shipping_company,
            })
            return {
              success: true,
              message: `Tracking code ${params.tracking_number} added to order #${orderNum}.`,
            }
          }

          return { error: `Unknown action: ${params.action}` }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_GET_PAYMENT_OPTIONS: {
      description:
        'List payment methods available in the store. Use when user asks "quais formas de pagamento?", "métodos de pagamento", "aceito pix?", etc.',
      inputSchema: jsonSchema({ type: 'object', properties: {} }),
      execute: async () => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
          const options = await client.getPaymentOptions()
          return {
            providers: options.map((o) => ({
              name: o.name,
              options: o.checkout_payment_options.map((opt) => opt.name),
            })),
          }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_QUERY_TRANSACTIONS: {
      description:
        'Get payment transactions for an order. Use when user asks "pagamento do pedido #X", "qual o status do pagamento?", "como pagou?", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          order_number: { type: 'string', description: 'Order number to look up' },
        },
        required: ['order_number'],
      }),
      execute: async (params: { order_number: string }) => {
        const supabase = getClient()

        const orderNum = params.order_number.replace('#', '')
        const { data: orderRow } = await supabase
          .from('store_orders')
          .select('id, external_id, order_number')
          .eq('store_id', storeId)
          .eq('order_number', orderNum)
          .single()

        if (!orderRow?.external_id) {
          return { error: `Order #${orderNum} not found or has no external ID` }
        }

        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
          const transactions = await client.getTransactions(parseInt(orderRow.external_id, 10))
          return {
            order_number: orderNum,
            transactions: transactions.map((t) => ({
              id: t.id,
              payment_method: t.payment_method?.type,
              status: t.status,
              amount: t.amount,
              created_at: t.created_at,
            })),
          }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_MANAGE_PAGES: {
      description:
        'Manage store content pages (About, FAQ, Shipping Policy, etc). List, create, update, or delete. Use when user says "cria página", "edita sobre nós", "lista páginas", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'create', 'update', 'delete'],
            description: 'Action to perform',
          },
          title: { type: 'string', description: 'Page title (for create/update)' },
          content: { type: 'string', description: 'Page content as HTML (for create/update)' },
          page_id: { type: 'string', description: 'Page ID (for update/delete)' },
          published: { type: 'boolean', description: 'Publish status (for create/update)' },
        },
        required: ['action'],
      }),
      execute: async (params: {
        action: string
        title?: string
        content?: string
        page_id?: string
        published?: boolean
      }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          if (params.action === 'list') {
            const pages = await client.getPages()
            return {
              pages: pages.map((p) => ({
                id: p.id,
                title: p.title?.pt ?? p.title?.es ?? p.title?.en ?? 'Sem título',
                published: p.published,
                updated_at: p.updated_at,
              })),
              total: pages.length,
            }
          }

          if (params.action === 'create') {
            if (!params.title) return { error: 'title is required for create' }
            const page = await client.createPage({
              title: { pt: params.title },
              content: params.content ? { pt: params.content } : undefined,
              published: params.published ?? true,
            })
            return {
              success: true,
              message: `Page "${params.title}" created (ID: ${page.id}).`,
              id: page.id,
            }
          }

          if (params.action === 'update') {
            if (!params.page_id) return { error: 'page_id is required for update' }
            const updateData: {
              title?: Record<string, string>
              content?: Record<string, string>
              published?: boolean
            } = {}
            if (params.title) updateData.title = { pt: params.title }
            if (params.content) updateData.content = { pt: params.content }
            if (params.published !== undefined) updateData.published = params.published
            await client.updatePage(parseInt(params.page_id), updateData)
            return { success: true, message: `Page ${params.page_id} updated.` }
          }

          if (params.action === 'delete') {
            if (!params.page_id) return { error: 'page_id is required for delete' }
            await client.deletePage(parseInt(params.page_id))
            return { success: true, message: `Page ${params.page_id} deleted.` }
          }

          return { error: `Unknown action: ${params.action}` }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_GET_STORE_INFO: {
      description:
        'Get store information (name, domain, plan, contact, social media). Use when user asks "info da loja", "qual meu domínio?", "dados da loja", etc.',
      inputSchema: jsonSchema({ type: 'object', properties: {} }),
      execute: async () => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
          const info = await client.getStoreInfo()
          return {
            name: info.name?.pt ?? info.name?.es ?? info.name?.en,
            email: info.email,
            phone: info.phone,
            domain: info.original_domain,
            domains: info.domains,
            plan: info.plan_name,
            country: info.country,
            language: info.main_language,
            currency: info.main_currency,
            instagram: info.instagram,
            facebook: info.facebook,
            created_at: info.created_at,
          }
        } catch (err) {
          return { error: `Failed: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_QUERY_MARGINS: {
      description:
        'Query profit margins for products. Shows margin percentage, gross profit, and can rank by lowest/highest margin. Use when user asks "qual minha margem?", "quais produtos têm menor margem?", "lucro bruto do mês?", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search by product name' },
          sort: {
            type: 'string',
            enum: ['lowest_margin', 'highest_margin', 'name'],
            description: 'Sort order (default: lowest_margin)',
          },
          period: {
            type: 'string',
            enum: ['today', 'this_week', 'this_month'],
            description: 'Period for gross profit calculation (default: this_month)',
          },
          limit: { type: 'number', description: 'Max results (default: 20)' },
        },
      }),
      execute: async (params: {
        search?: string
        sort?: string
        period?: string
        limit?: number
      }) => {
        const supabase = getClient()

        // Get products with cost_price
        let query = supabase
          .from('store_products')
          .select('id, name, sku, price, cost_price, stock_quantity')
          .eq('store_id', storeId)
          .eq('is_published', true)
          .not('cost_price', 'is', null)

        if (params.search) {
          query = query.ilike('name', `%${params.search}%`)
        }

        const { data: products } = await query.limit(200)

        if (!products || products.length === 0) {
          return {
            error:
              'No products with cost price found. Update product costs first using STORE_UPDATE_COST or the /products page.',
          }
        }

        let items = products.map((p) => {
          const price = Number(p.price ?? 0)
          const cost = Number(p.cost_price ?? 0)
          const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0
          const marginValue = price - cost
          return {
            name: p.name,
            sku: p.sku,
            price: `R$ ${price.toFixed(2)}`,
            cost: `R$ ${cost.toFixed(2)}`,
            margin_pct: Math.round(marginPct * 10) / 10,
            margin_value: `R$ ${marginValue.toFixed(2)}`,
            stock: p.stock_quantity,
          }
        })

        // Sort
        if (params.sort === 'highest_margin') {
          items.sort((a, b) => b.margin_pct - a.margin_pct)
        } else if (params.sort === 'name') {
          items.sort((a, b) => a.name.localeCompare(b.name))
        } else {
          items.sort((a, b) => a.margin_pct - b.margin_pct)
        }

        items = items.slice(0, params.limit ?? 20)

        // Calculate gross profit for the period
        const now = new Date()
        let startDate: Date
        switch (params.period) {
          case 'today':
            startDate = new Date(now)
            startDate.setHours(0, 0, 0, 0)
            break
          case 'this_week':
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - startDate.getDay())
            startDate.setHours(0, 0, 0, 0)
            break
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }

        const { data: orders } = await supabase
          .from('store_orders')
          .select('items')
          .eq('store_id', storeId)
          .gte('ordered_at', startDate.toISOString())

        const costMap = new Map<string, number>()
        for (const p of products) {
          if (p.cost_price) costMap.set(p.name, Number(p.cost_price))
        }

        let grossProfit = 0
        let coveredItems = 0
        for (const order of orders ?? []) {
          const orderItems = order.items as Array<{
            name: string
            quantity: number
            price: number
          }> | null
          if (!orderItems) continue
          for (const item of orderItems) {
            const cost = costMap.get(item.name)
            if (cost != null) {
              grossProfit += (item.price - cost) * item.quantity
              coveredItems++
            }
          }
        }

        return {
          products: items,
          period_gross_profit: `R$ ${grossProfit.toFixed(2)}`,
          period: params.period ?? 'this_month',
          items_with_cost_data: coveredItems,
        }
      },
    },

    STORE_UPDATE_COST: {
      description:
        'Update the cost price of a product. Use when user says "o custo do produto X é R$30", "atualiza o custo", etc. Cost is used to calculate profit margins.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          product_name: { type: 'string', description: 'Product name (fuzzy matched)' },
          sku: { type: 'string', description: 'Product SKU (alternative to name)' },
          cost_price: { type: 'number', description: 'New cost price in BRL' },
        },
        required: ['cost_price'],
      }),
      execute: async (params: { product_name?: string; sku?: string; cost_price: number }) => {
        const supabase = getClient()

        if (!params.product_name && !params.sku) {
          return { error: 'Provide either product_name or sku to identify the product.' }
        }

        // Find product
        let products: Array<{ id: string; name: string; price: number | null }> | null = null

        if (params.sku) {
          const { data } = await supabase
            .from('store_products')
            .select('id, name, price')
            .eq('store_id', storeId)
            .eq('sku', params.sku)
            .limit(5)
          products = data
        }

        if ((!products || products.length === 0) && params.product_name) {
          const { data } = await supabase
            .from('store_products')
            .select('id, name, price')
            .eq('store_id', storeId)
            .ilike('name', `%${params.product_name}%`)
            .limit(5)
          products = data

          // Fallback: accent-insensitive search
          if (!products || products.length === 0) {
            const { data: allProducts } = await supabase
              .from('store_products')
              .select('id, name, price')
              .eq('store_id', storeId)
              .limit(100)

            const needle = normalizeAccents(params.product_name)
            products = (allProducts ?? []).filter((p) => normalizeAccents(p.name).includes(needle))
          }
        }

        if (!products || products.length === 0) {
          return { error: `Product not found: "${params.product_name ?? params.sku}"` }
        }
        if (products.length > 1) {
          return {
            error: `Found ${products.length} products. Be more specific.`,
            matches: products.map((p) => p.name),
          }
        }

        const product = products[0]
        const { error } = await supabase
          .from('store_products')
          .update({ cost_price: params.cost_price })
          .eq('id', product.id)

        if (error) return { error: error.message }

        const price = Number(product.price ?? 0)
        const marginPct = price > 0 ? ((price - params.cost_price) / price) * 100 : 0

        return {
          success: true,
          message: `Cost updated for "${product.name}".`,
          product: product.name,
          sell_price: `R$ ${price.toFixed(2)}`,
          cost_price: `R$ ${params.cost_price.toFixed(2)}`,
          margin_pct: `${marginPct.toFixed(1)}%`,
          margin_value: `R$ ${(price - params.cost_price).toFixed(2)}`,
        }
      },
    },

    STORE_BULK_UPDATE_COST: {
      description:
        'Bulk update cost prices for multiple products at once. Use when the user provides a list of products with their costs (e.g., pasting a CSV/spreadsheet, or listing multiple products with costs). Accepts an array of entries with SKU or product name + cost price.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          entries: {
            type: 'array',
            description: 'Array of product cost entries to update',
            items: {
              type: 'object',
              properties: {
                sku: { type: 'string', description: 'Product SKU' },
                name: { type: 'string', description: 'Product name (used if SKU not provided)' },
                cost_price: { type: 'number', description: 'Cost price in BRL' },
              },
              required: ['cost_price'],
            },
          },
        },
        required: ['entries'],
      }),
      execute: async (params: {
        entries: Array<{ sku?: string; name?: string; cost_price: number }>
      }) => {
        const supabase = getClient()

        if (!params.entries || params.entries.length === 0) {
          return { error: 'No entries provided.' }
        }
        if (params.entries.length > 500) {
          return { error: 'Maximum 500 entries per request.' }
        }

        // Load all store products once for matching
        const { data: allProducts } = await supabase
          .from('store_products')
          .select('id, name, sku, price')
          .eq('store_id', storeId)

        if (!allProducts || allProducts.length === 0) {
          return { error: 'No products found in the store.' }
        }

        const matched: Array<{
          id: string
          name: string
          price: number | null
          cost_price: number
        }> = []
        const notFound: string[] = []

        // Build lookup maps before the loop to avoid O(n²) find() calls
        const bySkuMap = new Map<string, (typeof allProducts)[0]>()
        const byNameMap = new Map<string, (typeof allProducts)[0]>()
        const byNormalizedName = new Map<string, (typeof allProducts)[0]>()
        for (const p of allProducts) {
          if (p.sku) bySkuMap.set(p.sku.toLowerCase(), p)
          byNameMap.set(p.name.toLowerCase(), p)
          byNormalizedName.set(normalizeAccents(p.name), p)
        }
        const matchedIds = new Set<string>()

        for (const entry of params.entries) {
          if (entry.cost_price < 0) continue

          let product = entry.sku ? (bySkuMap.get(entry.sku.toLowerCase()) ?? null) : null

          if (!product && entry.name) {
            // Exact match first
            product = byNameMap.get(entry.name.toLowerCase()) ?? null
            // Fuzzy match fallback
            if (!product) {
              const needle = normalizeAccents(entry.name)
              for (const [normalizedKey, p] of byNormalizedName) {
                if (normalizedKey.includes(needle)) {
                  product = p
                  break
                }
              }
            }
          }

          if (product && !matchedIds.has(product.id)) {
            matchedIds.add(product.id)
            matched.push({
              id: product.id,
              name: product.name,
              price: product.price,
              cost_price: entry.cost_price,
            })
          } else if (!product) {
            notFound.push(entry.sku || entry.name || 'unknown')
          }
        }

        if (matched.length === 0) {
          return { error: 'No products matched.', not_found: notFound }
        }

        // Bulk update in batches of 50 to avoid sequential round-trips
        const BATCH_SIZE = 50
        let updated = 0
        let errors = 0
        for (let i = 0; i < matched.length; i += BATCH_SIZE) {
          const batch = matched.slice(i, i + BATCH_SIZE)
          const results = await Promise.allSettled(
            batch.map((m) =>
              supabase.from('store_products').update({ cost_price: m.cost_price }).eq('id', m.id)
            )
          )
          for (const r of results) {
            if (r.status === 'fulfilled' && !r.value.error) updated++
            else errors++
          }
        }

        const summary = matched.map((m) => {
          const price = Number(m.price ?? 0)
          const marginPct = price > 0 ? ((price - m.cost_price) / price) * 100 : 0
          return {
            product: m.name,
            cost: `R$ ${m.cost_price.toFixed(2)}`,
            margin: `${marginPct.toFixed(1)}%`,
          }
        })

        return {
          success: true,
          message: `Updated cost for ${updated} products.${errors > 0 ? ` ${errors} failed.` : ''}`,
          updated,
          errors,
          not_found: notFound.length > 0 ? notFound : undefined,
          products: summary,
        }
      },
    },

    STORE_ADD_PRICE_MONITOR: {
      description:
        'Create a price monitor for a competitor product. Automatically creates a scheduled workflow to scrape the URL periodically, track price history, and alert on changes. Use when user says "monitora o preço do produto X no site Y", "vigia esse concorrente", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL of the competitor product page to monitor' },
          product_name: {
            type: 'string',
            description: 'Name/description for this monitor (e.g., "Kit Páscoa — Concorrente X")',
          },
          marketplace: {
            type: 'string',
            description: 'Marketplace name (e.g., "Mercado Livre", "Amazon", "Shopee")',
          },
          own_product_name: {
            type: 'string',
            description: 'Optional: name of your own product to compare prices against',
          },
          alert_threshold_pct: {
            type: 'number',
            description: 'Price change threshold to trigger alert (default: 5%)',
          },
        },
        required: ['url', 'product_name', 'marketplace'],
      }),
      execute: async (params: {
        url: string
        product_name: string
        marketplace: string
        own_product_name?: string
        alert_threshold_pct?: number
      }) => {
        const supabase = getClient()

        // Find own product if specified
        let ownProductId: string | null = null
        if (params.own_product_name) {
          const { data: ownProducts } = await supabase
            .from('store_products')
            .select('id, name')
            .eq('store_id', storeId)
            .ilike('name', `%${params.own_product_name}%`)
            .limit(1)
          ownProductId = ownProducts?.[0]?.id ?? null
        }

        // Get team_id and user for workflow creation
        const { data: store } = await supabase
          .from('stores')
          .select('team_id')
          .eq('id', storeId)
          .single()
        if (!store) return { error: 'Store not found' }

        // Resolve a valid created_by: prefer the passed userId, fallback to team owner
        let createdBy = userId
        if (!createdBy) {
          const { data: owner } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', store.team_id)
            .eq('role', 'owner')
            .limit(1)
            .single()
          createdBy = owner?.user_id
        }
        if (!createdBy) return { error: 'Could not determine workflow creator' }

        // Create the workflow
        const { data: workflow, error: wfError } = await supabase
          .from('workflows')
          .insert({
            team_id: store.team_id,
            name: `Price: ${params.product_name}`,
            emoji: '👀',
            description: `Monitor ${params.product_name} on ${params.marketplace}`,
            status: 'published' as const,
            created_by: createdBy,
          })
          .select('id')
          .single()

        if (wfError || !workflow) {
          return { error: `Failed to create workflow: ${wfError?.message}` }
        }

        // Create scheduled trigger (every 4 hours)
        await supabase.from('workflow_triggers').insert({
          workflow_id: workflow.id,
          type: 'scheduled' as const,
          config: {
            schedule_type: 'cron',
            cron_expression: '0 */4 * * *',
            timezone: 'America/Sao_Paulo',
          } as unknown as Json,
        })

        // Create steps: web_scraping → ai_transform → telegram
        const hostname = (() => {
          try {
            return new URL(params.url).hostname
          } catch {
            return 'URL'
          }
        })()

        await supabase.from('workflow_steps').insert([
          {
            workflow_id: workflow.id,
            position: 0,
            type: 'web_scraping' as const,
            name: `Scrape: ${hostname}`,
            config: {
              action: 'scrape',
              url: params.url,
              output_format: 'markdown',
              only_main_content: true,
            } as unknown as Json,
          },
          {
            workflow_id: workflow.id,
            position: 1,
            type: 'ai' as const,
            name: 'AI: Extract price',
            config: {
              ai_action: 'transform',
              prompt_template: `Extract the main product price from this page content. Return ONLY the price in format "R$ XX.XX" (Brazilian Reais). If multiple prices, return the current/sale price. Content:\n\n{{prev.content}}`,
              output_format: 'text',
              temperature: 0.1,
              max_tokens: 100,
            } as unknown as Json,
          },
          {
            workflow_id: workflow.id,
            position: 2,
            type: 'utility' as const,
            name: 'Send Telegram Alert',
            config: {
              utility_type: 'send_telegram',
              telegram_template: `👀 *Price Check — ${params.product_name}*\n${params.marketplace}\n\n{{prev.content}}\n\n🔗 ${params.url}`,
              telegram_parse_mode: 'Markdown',
            } as unknown as Json,
          },
        ])

        // Create the price monitor entry
        const { data: monitor, error: monitorError } = await supabase
          .from('store_price_monitors')
          .insert({
            store_id: storeId,
            product_name: params.product_name,
            marketplace: params.marketplace,
            url: params.url,
            own_product_id: ownProductId,
            alert_threshold_pct: params.alert_threshold_pct ?? 5,
            workflow_id: workflow.id,
            is_active: true,
          })
          .select('id')
          .single()

        if (monitorError) {
          return { error: `Monitor created but failed to save: ${monitorError.message}` }
        }

        return {
          success: true,
          message: `Monitor created! Will check ${params.marketplace} every 4 hours.`,
          monitor_id: monitor.id,
          workflow_id: workflow.id,
          product_name: params.product_name,
          marketplace: params.marketplace,
          url: params.url,
        }
      },
    },

    STORE_LIST_PRICE_MONITORS: {
      description:
        'List all price monitors with latest prices, changes, and comparison to own prices. Use when user asks "como estão os preços dos concorrentes?", "lista monitores de preço", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          active_only: {
            type: 'boolean',
            description: 'Only show active monitors (default: true)',
          },
        },
      }),
      execute: async (params: { active_only?: boolean }) => {
        const supabase = getClient()

        let query = supabase
          .from('store_price_monitors')
          .select(
            'id, product_name, marketplace, url, last_price, previous_price, last_checked_at, is_active, price_changed_at, own_product_id, alert_threshold_pct'
          )
          .eq('store_id', storeId)
          .order('price_changed_at', { ascending: false, nullsFirst: false })

        if (params.active_only !== false) {
          query = query.eq('is_active', true)
        }

        const { data: monitors } = await query.limit(50)

        if (!monitors || monitors.length === 0) {
          return { monitors: [], total: 0, message: 'No price monitors configured.' }
        }

        // Get own product prices for comparison
        const ownProductIds = monitors.filter((m) => m.own_product_id).map((m) => m.own_product_id!)
        const ownPrices = new Map<string, { price: number; cost_price: number | null }>()
        if (ownProductIds.length > 0) {
          const { data: ownProducts } = await supabase
            .from('store_products')
            .select('id, price, cost_price')
            .in('id', ownProductIds)
          for (const p of ownProducts ?? []) {
            ownPrices.set(p.id, {
              price: Number(p.price ?? 0),
              cost_price: p.cost_price != null ? Number(p.cost_price) : null,
            })
          }
        }

        const result = monitors.map((m) => {
          const lastPrice = m.last_price ? Number(m.last_price) : null
          const prevPrice = m.previous_price ? Number(m.previous_price) : null
          const changePct =
            lastPrice && prevPrice && prevPrice > 0
              ? ((lastPrice - prevPrice) / prevPrice) * 100
              : null

          const own = m.own_product_id ? ownPrices.get(m.own_product_id) : null
          const ownDiffPct =
            own && lastPrice && lastPrice > 0 ? ((own.price - lastPrice) / lastPrice) * 100 : null

          return {
            id: m.id,
            product_name: m.product_name,
            marketplace: m.marketplace,
            url: m.url,
            last_price: lastPrice ? `R$ ${lastPrice.toFixed(2)}` : null,
            price_change: changePct ? `${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}%` : null,
            last_checked: m.last_checked_at,
            is_active: m.is_active,
            own_price: own ? `R$ ${own.price.toFixed(2)}` : null,
            own_vs_competitor: ownDiffPct
              ? `${ownDiffPct > 0 ? '+' : ''}${ownDiffPct.toFixed(1)}%`
              : null,
          }
        })

        return { monitors: result, total: result.length }
      },
    },

    STORE_REMOVE_PRICE_MONITOR: {
      description:
        'Deactivate a price monitor and pause its associated workflow. Use when user says "para de monitorar X", "remove o monitor", etc.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          monitor_id: { type: 'string', description: 'Monitor ID to deactivate' },
          product_name: {
            type: 'string',
            description: 'Search by product name (alternative to monitor_id)',
          },
        },
      }),
      execute: async (params: { monitor_id?: string; product_name?: string }) => {
        const supabase = getClient()

        let monitorId = params.monitor_id
        let monitorName: string | undefined

        if (!monitorId && params.product_name) {
          const { data: monitors } = await supabase
            .from('store_price_monitors')
            .select('id, product_name, workflow_id')
            .eq('store_id', storeId)
            .eq('is_active', true)
            .ilike('product_name', `%${params.product_name}%`)
            .limit(5)

          if (!monitors || monitors.length === 0) {
            return { error: `No active monitor found for "${params.product_name}"` }
          }
          if (monitors.length > 1) {
            return {
              error: `Found ${monitors.length} monitors. Be more specific.`,
              matches: monitors.map((m) => ({ id: m.id, name: m.product_name })),
            }
          }
          monitorId = monitors[0].id
          monitorName = monitors[0].product_name
        }

        if (!monitorId) {
          return { error: 'Provide either monitor_id or product_name.' }
        }

        // Get monitor to find workflow
        const { data: monitor } = await supabase
          .from('store_price_monitors')
          .select('id, product_name, workflow_id')
          .eq('id', monitorId)
          .eq('store_id', storeId)
          .single()

        if (!monitor) return { error: 'Monitor not found.' }

        // Deactivate monitor
        await supabase.from('store_price_monitors').update({ is_active: false }).eq('id', monitorId)

        // Pause associated workflow
        if (monitor.workflow_id) {
          await supabase.from('workflows').update({ status: 'draft' }).eq('id', monitor.workflow_id)
        }

        return {
          success: true,
          message: `Monitor "${monitor.product_name}" deactivated.`,
        }
      },
    },

    STORE_FORECAST_DEMAND: {
      description:
        'Forecast product demand based on real sales history from the store API. Fetches orders and stock directly from the platform — no local sync needed. Returns actionable categories: products running low, out-of-stock bestsellers, and healthy stock. Use when user asks "previsão de demanda", "quando vai acabar?", "preciso repor estoque?", "quais produtos vão acabar?".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Days of sales history to analyze (default: 30, max: 90)',
          },
          search: {
            type: 'string',
            description: 'Filter by product name (optional, fuzzy match)',
          },
          top: {
            type: 'number',
            description: 'How many top sellers to analyze stock for (default: 30, max: 50)',
          },
        },
      }),
      execute: async (params: { days?: number; search?: string; top?: number }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        const historyDays = Math.min(Math.max(params.days ?? 30, 7), 90)
        const topN = Math.min(Math.max(params.top ?? 30, 5), 50)

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          // 1. Fetch orders in the analysis period
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - historyDays)
          startDate.setHours(0, 0, 0, 0)

          const allOrders: Array<{
            products: Array<{
              product_id: number | null
              name: string
              quantity: string
              price: string
            }>
            created_at: string
          }> = []
          let page = 1
          try {
            while (true) {
              const orders = await client.getOrders(page, 200, {
                created_at_min: startDate.toISOString(),
              })
              for (const o of orders) {
                allOrders.push({
                  products: (o.products ?? []).map((p) => ({
                    product_id: p.product_id,
                    name: p.name ?? 'Produto',
                    quantity: String(p.quantity ?? '1'),
                    price: String(p.price ?? '0'),
                  })),
                  created_at: o.created_at,
                })
              }
              if (orders.length < 200) break
              page++
            }
          } catch {
            // Nuvemshop returns 404 when there are no orders
          }

          if (allOrders.length === 0) {
            return {
              message: `Nenhum pedido nos últimos ${historyDays} dias. Preciso de histórico de vendas pra prever demanda.`,
              orders_analyzed: 0,
            }
          }

          // 2. Aggregate sales by product_id (primary key) with daily breakdown
          const now = new Date()
          const productSales = new Map<
            number,
            {
              name: string
              productId: number
              dailySales: Map<string, number>
              totalQty: number
              revenue: number
            }
          >()

          for (const order of allOrders) {
            const day = order.created_at.slice(0, 10)
            for (const item of order.products) {
              if (!item.product_id) continue
              const key = item.product_id
              if (params.search && !item.name.toLowerCase().includes(params.search.toLowerCase()))
                continue

              if (!productSales.has(key)) {
                productSales.set(key, {
                  name: item.name,
                  productId: key,
                  dailySales: new Map(),
                  totalQty: 0,
                  revenue: 0,
                })
              }
              const prod = productSales.get(key)!
              const qty = parseInt(item.quantity, 10) || 1
              prod.dailySales.set(day, (prod.dailySales.get(day) ?? 0) + qty)
              prod.totalQty += qty
              prod.revenue += qty * (parseFloat(item.price) || 0)
            }
          }

          if (productSales.size === 0) {
            return {
              message: params.search
                ? `Nenhum produto com "${params.search}" vendido nos últimos ${historyDays} dias.`
                : `Nenhum produto com ID encontrado nos pedidos.`,
              orders_analyzed: allOrders.length,
            }
          }

          // 3. Rank by total sold, take top N for stock check
          const ranked = [...productSales.values()].sort((a, b) => b.totalQty - a.totalQty)
          const topSellers = ranked.slice(0, topN)

          // 4. Fetch current stock only for top sellers (parallel, max 10 concurrent)
          const stockMap = new Map<number, { stock: number; price: number }>()
          const batchSize = 10
          for (let i = 0; i < topSellers.length; i += batchSize) {
            const batch = topSellers.slice(i, i + batchSize)
            const results = await Promise.allSettled(
              batch.map(async (s) => {
                const product = await client.getProduct(s.productId)
                const totalStock = (product.variants ?? []).reduce(
                  (sum, v) => sum + (v.stock ?? 0),
                  0
                )
                return {
                  id: s.productId,
                  stock: totalStock,
                  price: parseFloat(String(product.variants?.[0]?.price ?? '0')),
                }
              })
            )
            for (const r of results) {
              if (r.status === 'fulfilled') {
                stockMap.set(r.value.id, { stock: r.value.stock, price: r.value.price })
              }
            }
          }

          // 5. Compute forecasts with categories
          const restockUrgente: Array<Record<string, unknown>> = [] // stock > 0, runs out ≤ 7 days
          const esgotadoVendendo: Array<Record<string, unknown>> = [] // stock = 0, had sales
          const monitorar: Array<Record<string, unknown>> = [] // stock > 0, runs out 8-14 days
          let healthyCount = 0

          for (const data of topSellers) {
            const avgDaily = data.totalQty / historyDays
            const stockInfo = stockMap.get(data.productId)
            const currentStock = stockInfo?.stock ?? 0
            const daysUntilOut = avgDaily > 0 ? Math.round(currentStock / avgDaily) : null
            const restockQty30d = avgDaily > 0 ? Math.ceil(avgDaily * 30) - currentStock : 0

            // Weekly trend
            let recentQty = 0
            let previousQty = 0
            for (const [day, qty] of data.dailySales) {
              const daysAgo = Math.floor(
                (now.getTime() - new Date(day).getTime()) / (1000 * 60 * 60 * 24)
              )
              if (daysAgo <= 7) recentQty += qty
              else if (daysAgo <= 14) previousQty += qty
            }
            let trend = 'estável'
            if (previousQty > 0) {
              const change = ((recentQty - previousQty) / previousQty) * 100
              if (change > 20) trend = `↑ crescendo (+${Math.round(change)}%)`
              else if (change < -20) trend = `↓ caindo (${Math.round(change)}%)`
            } else if (recentQty > 0) {
              trend = '↑ demanda nova'
            }

            const item = {
              produto: data.name,
              vendas_periodo: data.totalQty,
              media_dia: Math.round(avgDaily * 10) / 10,
              estoque_atual: currentStock,
              dias_ate_acabar: daysUntilOut,
              tendencia: trend,
              faturamento_periodo: `R$ ${data.revenue.toFixed(2)}`,
              ...(restockQty30d > 0 ? { repor_para_30_dias: restockQty30d } : {}),
            }

            if (currentStock === 0 && data.totalQty > 0) {
              esgotadoVendendo.push(item)
            } else if (daysUntilOut !== null && daysUntilOut <= 7) {
              restockUrgente.push(item)
            } else if (daysUntilOut !== null && daysUntilOut <= 14) {
              monitorar.push(item)
            } else {
              healthyCount++
            }
          }

          // Sort each category by avg daily sales desc (most impactful first)
          const byAvgDaily = (a: Record<string, unknown>, b: Record<string, unknown>) =>
            (b.media_dia as number) - (a.media_dia as number)
          esgotadoVendendo.sort(byAvgDaily)
          restockUrgente.sort(
            (a, b) => (a.dias_ate_acabar as number) - (b.dias_ate_acabar as number)
          )

          return {
            resumo: {
              periodo: `Últimos ${historyDays} dias`,
              pedidos_analisados: allOrders.length,
              produtos_com_vendas: productSales.size,
              top_analisados: topSellers.length,
            },
            // Products with stock that will run out in ≤ 7 days — BUY NOW
            restock_urgente:
              restockUrgente.length > 0
                ? restockUrgente.slice(0, 10)
                : 'Nenhum produto com estoque prestes a acabar (≤ 7 dias)',
            // Out of stock but selling — MISSED REVENUE
            esgotado_vendendo:
              esgotadoVendendo.length > 0
                ? esgotadoVendendo.slice(0, 10)
                : 'Nenhum produto esgotado com vendas recentes',
            // Running low (8-14 days) — WATCH
            monitorar:
              monitorar.length > 0
                ? monitorar.slice(0, 5)
                : 'Nenhum produto na faixa de monitoramento (8-14 dias)',
            estoque_saudavel: `${healthyCount} produtos com estoque para 14+ dias`,
          }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_ANALYZE_CUSTOMERS: {
      description:
        'Analyze customers using RFM segmentation (Recency, Frequency, Monetary). Classifies customers into segments: VIP, Loyal, Promising, At Risk, Lost, New. Can also predict repurchase timing. Use when user asks "analise meus clientes", "segmentação de clientes", "quem são meus melhores clientes?", "clientes em risco", "quais clientes estão sumindo?", "tem alguém pra mandar cupom?", "quais clientes devem comprar em breve?".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Days of order history to analyze (default: 90, max: 365)',
          },
          focus: {
            type: 'string',
            enum: ['overview', 'repurchase', 'at_risk'],
            description:
              'Analysis focus: overview (all segments), repurchase (overdue customers), at_risk (declining customers). Default: overview',
          },
          limit: {
            type: 'number',
            description: 'Max customers per segment to return (default: 10)',
          },
        },
      }),
      execute: async (params: { days?: number; focus?: string; limit?: number }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        const historyDays = Math.min(Math.max(params.days ?? 90, 7), 365)
        const focus = params.focus ?? 'overview'
        const limitPerSegment = Math.min(Math.max(params.limit ?? 10, 1), 50)

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          // 1. Fetch orders in the analysis period
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - historyDays)
          startDate.setHours(0, 0, 0, 0)

          const allOrders: Array<{
            customer_email: string | null
            customer_name: string | null
            total: string
            created_at: string
          }> = []
          let page = 1
          try {
            while (true) {
              const orders = await client.getOrders(page, 200, {
                created_at_min: startDate.toISOString(),
              })
              for (const o of orders) {
                allOrders.push({
                  customer_email: o.customer?.email ?? null,
                  customer_name: o.customer?.name ?? null,
                  total: o.total ?? '0',
                  created_at: o.created_at,
                })
              }
              if (orders.length < 200) break
              page++
            }
          } catch {
            // Nuvemshop returns 404 when there are no orders
          }

          if (allOrders.length === 0) {
            return {
              message: `Nenhum pedido nos últimos ${historyDays} dias. Preciso de histórico de vendas pra analisar clientes.`,
              pedidos_analisados: 0,
            }
          }

          // 2. Group orders by customer email
          let ordersWithoutCustomer = 0
          const customerMap = new Map<
            string,
            {
              name: string
              email: string
              orderDates: string[]
              totalSpent: number
              orderCount: number
            }
          >()

          for (const order of allOrders) {
            if (!order.customer_email) {
              ordersWithoutCustomer++
              continue
            }
            const key = order.customer_email.toLowerCase()
            if (!customerMap.has(key)) {
              customerMap.set(key, {
                name: order.customer_name ?? order.customer_email,
                email: order.customer_email,
                orderDates: [],
                totalSpent: 0,
                orderCount: 0,
              })
            }
            const cust = customerMap.get(key)!
            cust.orderDates.push(order.created_at)
            cust.totalSpent += parseFloat(order.total) || 0
            cust.orderCount++
            // Keep the most recent name
            if (order.customer_name) cust.name = order.customer_name
          }

          if (customerMap.size === 0) {
            return {
              message: `${allOrders.length} pedidos encontrados, mas nenhum com email de cliente. Não consigo segmentar sem identificador.`,
              pedidos_analisados: allOrders.length,
            }
          }

          const customers = [...customerMap.values()]
          const now = new Date()

          // 3. Calculate RFM raw values
          const recencyValues = customers.map((c) => {
            const lastOrder = c.orderDates
              .map((d) => new Date(d).getTime())
              .sort((a, b) => b - a)[0]
            return Math.round((now.getTime() - lastOrder) / (1000 * 60 * 60 * 24))
          })
          const frequencyValues = customers.map((c) => c.orderCount)
          const monetaryValues = customers.map((c) => c.totalSpent)

          // 4. Calculate quintile scores
          // Recency: LOWER is better (more recent = higher score)
          const rScores = calculateQuintiles(recencyValues, false)
          const fScores = calculateQuintiles(frequencyValues, true)
          const mScores = calculateQuintiles(monetaryValues, true)

          // 5. Build segmented results
          type CustomerResult = {
            nome: string
            email: string
            pedidos: number
            total_gasto: string
            ultimo_pedido: string
            rfm: string
            intervalo_medio?: string
            dias_atrasado?: number
            previsao_recompra?: string
          }

          const segments: Record<string, { clientes: CustomerResult[]; receita: number }> = {
            VIP: { clientes: [], receita: 0 },
            Loyal: { clientes: [], receita: 0 },
            Promising: { clientes: [], receita: 0 },
            'At Risk': { clientes: [], receita: 0 },
            Lost: { clientes: [], receita: 0 },
            New: { clientes: [], receita: 0 },
          }

          const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)

          for (let i = 0; i < customers.length; i++) {
            const c = customers[i]
            const segment = mapRfmSegment(rScores[i], fScores[i], mScores[i])
            const repurchase = calculateRepurchaseData(c.orderDates)
            const lastOrderDate = c.orderDates
              .map((d) => new Date(d).getTime())
              .sort((a, b) => b - a)[0]
            const daysSinceLast = Math.round(
              (now.getTime() - lastOrderDate) / (1000 * 60 * 60 * 24)
            )

            const result: CustomerResult = {
              nome: c.name,
              email: c.email,
              pedidos: c.orderCount,
              total_gasto: `R$ ${c.totalSpent.toFixed(2)}`,
              ultimo_pedido: daysSinceLast === 0 ? 'hoje' : `${daysSinceLast} dias atrás`,
              rfm: `${rScores[i]}-${fScores[i]}-${mScores[i]}`,
            }

            if (repurchase) {
              result.intervalo_medio = `${repurchase.avgInterval} dias`
              if (repurchase.daysOverdue > 0) {
                result.dias_atrasado = repurchase.daysOverdue
              } else {
                const daysUntilNext = repurchase.avgInterval - daysSinceLast
                if (daysUntilNext > 0) {
                  result.previsao_recompra = `em ~${Math.round(daysUntilNext)} dias`
                }
              }
            }

            if (!segments[segment]) {
              segments[segment] = { clientes: [], receita: 0 }
            }
            segments[segment].clientes.push(result)
            segments[segment].receita += c.totalSpent
          }

          // Sort customers within each segment by total spent descending
          for (const seg of Object.values(segments)) {
            seg.clientes.sort(
              (a, b) => parseFloat(b.total_gasto.slice(3)) - parseFloat(a.total_gasto.slice(3))
            )
          }

          // 6. Format output based on focus
          if (focus === 'repurchase') {
            // Repurchase focus: show overdue and upcoming
            const overdue: CustomerResult[] = []
            const upcoming: CustomerResult[] = []

            for (const seg of Object.values(segments)) {
              for (const c of seg.clientes) {
                if (c.dias_atrasado && c.dias_atrasado > 0) {
                  overdue.push(c)
                } else if (c.previsao_recompra) {
                  upcoming.push(c)
                }
              }
            }

            overdue.sort((a, b) => (b.dias_atrasado ?? 0) - (a.dias_atrasado ?? 0))
            const customersWithInterval = customers.filter(
              (c) => calculateRepurchaseData(c.orderDates) !== null
            ).length
            const excludedSingleOrder = customers.length - customersWithInterval

            return {
              resumo: {
                periodo: `Últimos ${historyDays} dias`,
                clientes_analisados: customersWithInterval,
                clientes_com_recompra_prevista: overdue.length + upcoming.length,
                excluidos_pedido_unico: excludedSingleOrder,
              },
              recompra_atrasada:
                overdue.length > 0
                  ? overdue.slice(0, limitPerSegment)
                  : 'Nenhum cliente atrasado para recompra',
              recompra_proxima:
                upcoming.length > 0
                  ? upcoming.slice(0, limitPerSegment)
                  : 'Nenhum cliente com recompra prevista nos próximos dias',
            }
          }

          if (focus === 'at_risk') {
            // At Risk focus: show only At Risk + Lost segments
            const atRiskClients = segments['At Risk'].clientes.slice(0, limitPerSegment)
            const lostClients = segments['Lost'].clientes.slice(0, limitPerSegment)

            return {
              resumo: {
                periodo: `Últimos ${historyDays} dias`,
                pedidos_analisados: allOrders.length,
                clientes_em_risco: segments['At Risk'].clientes.length,
                clientes_perdidos: segments['Lost'].clientes.length,
                receita_em_risco: `R$ ${(segments['At Risk'].receita + segments['Lost'].receita).toFixed(2)}`,
              },
              em_risco:
                atRiskClients.length > 0 ? atRiskClients : 'Nenhum cliente em risco identificado',
              perdidos:
                lostClients.length > 0 ? lostClients : 'Nenhum cliente perdido identificado',
              acoes_sugeridas: [
                ...(segments['At Risk'].clientes.length > 0
                  ? [
                      `${segments['At Risk'].clientes.length} clientes Em Risco com R$ ${segments['At Risk'].receita.toFixed(2)} em compras — envie cupom de reativação`,
                    ]
                  : []),
                ...(segments['Lost'].clientes.length > 0
                  ? [
                      `${segments['Lost'].clientes.length} clientes Perdidos com R$ ${segments['Lost'].receita.toFixed(2)} em compras passadas — campanha de win-back`,
                    ]
                  : []),
              ],
            }
          }

          // Default: overview
          const segmentOutput: Record<
            string,
            | {
                total: number
                receita_total: string
                pct_receita: string
                clientes: CustomerResult[]
              }
            | string
          > = {}

          const segmentOrder = ['VIP', 'Loyal', 'Promising', 'At Risk', 'Lost', 'New']
          for (const name of segmentOrder) {
            const seg = segments[name]
            if (seg.clientes.length > 0) {
              segmentOutput[name.toLowerCase().replace(' ', '_')] = {
                total: seg.clientes.length,
                receita_total: `R$ ${seg.receita.toFixed(2)}`,
                pct_receita:
                  totalRevenue > 0 ? `${Math.round((seg.receita / totalRevenue) * 100)}%` : '0%',
                clientes: seg.clientes.slice(0, limitPerSegment),
              }
            }
          }

          // Build action suggestions
          const acoes: string[] = []
          if (segments['VIP'].clientes.length > 0) {
            acoes.push(
              `${segments['VIP'].clientes.length} clientes VIP geram ${totalRevenue > 0 ? Math.round((segments['VIP'].receita / totalRevenue) * 100) : 0}% da receita — considere programa de fidelidade`
            )
          }
          if (segments['At Risk'].clientes.length > 0) {
            acoes.push(
              `${segments['At Risk'].clientes.length} clientes Em Risco não compram há tempo — envie cupom de reativação`
            )
          }
          if (segments['Lost'].clientes.length > 0) {
            acoes.push(
              `${segments['Lost'].clientes.length} clientes Perdidos somam R$ ${segments['Lost'].receita.toFixed(2)} em compras passadas — campanha de win-back`
            )
          }
          if (segments['Promising'].clientes.length > 0) {
            acoes.push(
              `${segments['Promising'].clientes.length} clientes Promissores compraram recentemente — incentive segunda compra`
            )
          }

          return {
            resumo: {
              periodo: `Últimos ${historyDays} dias`,
              pedidos_analisados: allOrders.length,
              clientes_unicos: customerMap.size,
              pedidos_sem_cliente: ordersWithoutCustomer,
            },
            segmentos: segmentOutput,
            acoes_sugeridas: acoes.length > 0 ? acoes : ['Base de clientes saudável!'],
          }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_ANALYZE_PRODUCTS: {
      description:
        'Analyze products using ABC/Pareto classification. Classifies products by revenue contribution: A (top 80%), B (next 15%), C (bottom 5%). Also identifies dead stock (products with inventory but no sales). Use when user asks "analise meus produtos", "curva ABC", "quais produtos mais vendem?", "quais produtos são mais importantes?", "estoque parado", "produtos classe A", "quais produtos não vendem?".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Days of sales history to analyze (default: 30, max: 365)',
          },
          include_dead_stock: {
            type: 'boolean',
            description: 'Include products with stock but zero sales (default: true)',
          },
          limit: {
            type: 'number',
            description: 'Max products per class to return (default: 15)',
          },
        },
      }),
      execute: async (params: { days?: number; include_dead_stock?: boolean; limit?: number }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        const historyDays = Math.min(Math.max(params.days ?? 30, 7), 365)
        const includeDeadStock = params.include_dead_stock !== false
        const limitPerClass = Math.min(Math.max(params.limit ?? 15, 1), 50)

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          // 1. Fetch orders in the analysis period
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - historyDays)
          startDate.setHours(0, 0, 0, 0)

          const allOrders: Array<{
            products: Array<{
              product_id: number | null
              name: string
              quantity: string
              price: string
            }>
            created_at: string
          }> = []
          let page = 1
          try {
            while (true) {
              const orders = await client.getOrders(page, 200, {
                created_at_min: startDate.toISOString(),
              })
              for (const o of orders) {
                allOrders.push({
                  products: (o.products ?? []).map((p) => ({
                    product_id: p.product_id,
                    name: p.name ?? 'Produto',
                    quantity: String(p.quantity ?? '1'),
                    price: String(p.price ?? '0'),
                  })),
                  created_at: o.created_at,
                })
              }
              if (orders.length < 200) break
              page++
            }
          } catch {
            // Nuvemshop returns 404 when there are no orders
          }

          if (allOrders.length === 0) {
            return {
              message: `Nenhum pedido nos últimos ${historyDays} dias. Preciso de histórico de vendas pra classificar produtos.`,
              pedidos_analisados: 0,
            }
          }

          // 2. Aggregate revenue and units by product_id
          const productSales = new Map<
            number,
            {
              name: string
              productId: number
              revenue: number
              unitsSold: number
              lastSaleDate: string
            }
          >()

          for (const order of allOrders) {
            for (const item of order.products) {
              if (!item.product_id) continue
              const key = item.product_id
              if (!productSales.has(key)) {
                productSales.set(key, {
                  name: item.name,
                  productId: key,
                  revenue: 0,
                  unitsSold: 0,
                  lastSaleDate: order.created_at,
                })
              }
              const prod = productSales.get(key)!
              const qty = parseInt(item.quantity, 10) || 1
              prod.unitsSold += qty
              prod.revenue += qty * (parseFloat(item.price) || 0)
              if (order.created_at > prod.lastSaleDate) {
                prod.lastSaleDate = order.created_at
              }
            }
          }

          if (productSales.size === 0) {
            return {
              message: `Pedidos encontrados mas nenhum com product_id válido.`,
              pedidos_analisados: allOrders.length,
            }
          }

          // 3. Sort by revenue descending, assign ABC class
          const ranked = [...productSales.values()].sort((a, b) => b.revenue - a.revenue)
          const totalRevenue = ranked.reduce((sum, p) => sum + p.revenue, 0)

          let cumulative = 0
          const classified: Array<{
            name: string
            productId: number
            revenue: number
            revenueShare: number
            cumulativeShare: number
            class: 'A' | 'B' | 'C'
            unitsSold: number
            lastSaleDate: string
          }> = []

          for (const prod of ranked) {
            cumulative += prod.revenue
            const revenueShare = totalRevenue > 0 ? (prod.revenue / totalRevenue) * 100 : 0
            const cumulativeShare = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0

            let abcClass: 'A' | 'B' | 'C'
            if (cumulativeShare <= 80 || classified.filter((p) => p.class === 'A').length === 0) {
              // At least 1 product in A, then up to 80% cumulative
              abcClass = cumulativeShare <= 80 ? 'A' : classified.length === 0 ? 'A' : 'B'
            } else if (cumulativeShare <= 95) {
              abcClass = 'B'
            } else {
              abcClass = 'C'
            }

            // Edge case: first product always gets A
            if (classified.length === 0) abcClass = 'A'

            classified.push({
              ...prod,
              revenueShare,
              cumulativeShare,
              class: abcClass,
            })
          }

          // 4. Fetch stock for classified products (batched, 10 concurrent)
          const stockMap = new Map<number, { stock: number; price: number }>()
          const batchSize = 10
          const productIds = classified.map((p) => p.productId)
          for (let i = 0; i < productIds.length; i += batchSize) {
            const batch = productIds.slice(i, i + batchSize)
            const results = await Promise.allSettled(
              batch.map(async (pid) => {
                const product = await client.getProduct(pid)
                const totalStock = (product.variants ?? []).reduce(
                  (sum, v) => sum + (v.stock ?? 0),
                  0
                )
                return {
                  id: pid,
                  stock: totalStock,
                  price: parseFloat(String(product.variants?.[0]?.price ?? '0')),
                }
              })
            )
            for (const r of results) {
              if (r.status === 'fulfilled') {
                stockMap.set(r.value.id, { stock: r.value.stock, price: r.value.price })
              }
            }
          }

          // 5. Fetch cost_price from Supabase for margin analysis
          const { data: storeProducts } = await supabase
            .from('store_products')
            .select('external_id, cost_price, name')
            .eq('store_id', storeId)
            .not('cost_price', 'is', null)

          const costMap = new Map<string, number>()
          if (storeProducts) {
            for (const sp of storeProducts) {
              if (sp.external_id && sp.cost_price != null) {
                costMap.set(String(sp.external_id), Number(sp.cost_price))
              }
            }
          }

          // 6. Build class output
          type ProductResult = {
            nome: string
            receita: string
            pct_receita: string
            unidades_vendidas: number
            estoque_atual: number
            giro: number | string
            margem?: string
            preco?: string
            custo?: string
          }

          const classes: Record<
            string,
            {
              total_produtos: number
              receita: number
              produtos: ProductResult[]
              margins: number[]
            }
          > = {
            A: { total_produtos: 0, receita: 0, produtos: [], margins: [] },
            B: { total_produtos: 0, receita: 0, produtos: [], margins: [] },
            C: { total_produtos: 0, receita: 0, produtos: [], margins: [] },
          }

          for (const p of classified) {
            const cls = classes[p.class]
            cls.total_produtos++
            cls.receita += p.revenue

            const stockInfo = stockMap.get(p.productId)
            const currentStock = stockInfo?.stock ?? 0
            const sellingPrice = stockInfo?.price ?? 0
            const turnover =
              currentStock > 0 ? Math.round((p.unitsSold / currentStock) * 10) / 10 : 'N/A'

            const costPrice = costMap.get(String(p.productId))
            const marginPct =
              costPrice != null && sellingPrice > 0
                ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 1000) / 10
                : undefined

            if (marginPct !== undefined) cls.margins.push(marginPct)

            const item: ProductResult = {
              nome: p.name,
              receita: `R$ ${p.revenue.toFixed(2)}`,
              pct_receita: `${Math.round(p.revenueShare * 10) / 10}%`,
              unidades_vendidas: p.unitsSold,
              estoque_atual: currentStock,
              giro: turnover,
            }

            if (marginPct !== undefined) {
              item.margem = `${marginPct}%`
              item.preco = `R$ ${sellingPrice.toFixed(2)}`
              item.custo = `R$ ${costPrice!.toFixed(2)}`
            }

            cls.produtos.push(item)
          }

          // 7. Dead stock identification
          let deadStock: Array<{
            nome: string
            sku?: string
            estoque: number
            preco: string
            valor_parado: string
            ultima_venda?: string
          }> = []

          if (includeDeadStock) {
            const allProducts = await client.getAllProducts()
            const soldProductIds = new Set(productSales.keys())

            for (const product of allProducts) {
              const totalStock = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
              if (totalStock <= 0) continue
              if (soldProductIds.has(product.id)) continue

              const name = product.name?.pt ?? product.name?.es ?? product.name?.en ?? 'Sem nome'
              const price = parseFloat(String(product.variants[0]?.price ?? '0'))
              const sku = product.variants[0]?.sku ?? undefined

              deadStock.push({
                nome: name,
                sku,
                estoque: totalStock,
                preco: `R$ ${price.toFixed(2)}`,
                valor_parado: `R$ ${(totalStock * price).toFixed(2)}`,
              })
            }

            // Sort by stock value descending
            deadStock.sort(
              (a, b) =>
                parseFloat(b.valor_parado.slice(3).replace('.', '').replace(',', '.')) -
                parseFloat(a.valor_parado.slice(3).replace('.', '').replace(',', '.'))
            )
            deadStock = deadStock.slice(0, 20)
          }

          // 8. Format output
          const totalDeadStockValue = deadStock.reduce(
            (sum, d) => sum + parseFloat(d.valor_parado.slice(3)),
            0
          )

          const classOutput: Record<
            string,
            {
              total_produtos: number
              pct_catalogo: string
              receita: string
              pct_receita: string
              margem_media?: string
              produtos: ProductResult[]
            }
          > = {}

          const totalProducts = classified.length
          for (const [name, cls] of Object.entries(classes)) {
            if (cls.total_produtos === 0) continue
            classOutput[`classe_${name.toLowerCase()}`] = {
              total_produtos: cls.total_produtos,
              pct_catalogo:
                totalProducts > 0
                  ? `${Math.round((cls.total_produtos / totalProducts) * 100)}%`
                  : '0%',
              receita: `R$ ${cls.receita.toFixed(2)}`,
              pct_receita:
                totalRevenue > 0 ? `${Math.round((cls.receita / totalRevenue) * 100)}%` : '0%',
              ...(cls.margins.length > 0
                ? {
                    margem_media: `${Math.round((cls.margins.reduce((a, b) => a + b, 0) / cls.margins.length) * 10) / 10}%`,
                  }
                : {}),
              produtos: cls.produtos.slice(0, limitPerClass),
            }
          }

          // Action suggestions
          const acoes: string[] = []
          if (classes['A'].total_produtos > 0) {
            acoes.push(
              `${classes['A'].total_produtos} produtos Classe A geram ${totalRevenue > 0 ? Math.round((classes['A'].receita / totalRevenue) * 100) : 0}% do faturamento — priorize estoque e visibilidade`
            )
          }
          if (deadStock.length > 0) {
            acoes.push(
              `R$ ${totalDeadStockValue.toFixed(2)} em estoque parado (${deadStock.length} produtos) — considere promoção ou bundle`
            )
          }
          if (classes['A'].margins.length > 0 && classes['C'].margins.length > 0) {
            const avgMarginA =
              classes['A'].margins.reduce((a, b) => a + b, 0) / classes['A'].margins.length
            const avgMarginC =
              classes['C'].margins.reduce((a, b) => a + b, 0) / classes['C'].margins.length
            if (avgMarginC < avgMarginA) {
              acoes.push(
                `Classe C tem margem média de ${Math.round(avgMarginC)}% vs ${Math.round(avgMarginA)}% da Classe A — revise precificação`
              )
            }
          }
          if (classes['C'].total_produtos > 0) {
            acoes.push(
              `${classes['C'].total_produtos} produtos Classe C geram apenas ${totalRevenue > 0 ? Math.round((classes['C'].receita / totalRevenue) * 100) : 0}% da receita — avalie descontinuar os menos rentáveis`
            )
          }

          return {
            resumo: {
              periodo: `Últimos ${historyDays} dias`,
              pedidos_analisados: allOrders.length,
              produtos_vendidos: productSales.size,
              receita_total: `R$ ${totalRevenue.toFixed(2)}`,
            },
            classificacao: classOutput,
            ...(deadStock.length > 0
              ? { estoque_parado: deadStock }
              : { estoque_parado: 'Nenhum produto com estoque parado identificado' }),
            acoes_sugeridas: acoes.length > 0 ? acoes : ['Catálogo bem distribuído!'],
          }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_ESTIMATE_LTV: {
      description:
        'Estimate Customer Lifetime Value (LTV) by segment. Uses order history and optionally cost data for profit-based LTV. Use when user asks "qual o LTV dos meus clientes?", "valor vitalício", "quanto vale cada cliente?", "lifetime value", "LTV por segmento".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Days of order history to analyze (default: 180, max: 365)',
          },
          projected_years: {
            type: 'number',
            description: 'Years to project LTV forward (default: 2, max: 5)',
          },
          limit: {
            type: 'number',
            description: 'Max top customers to return (default: 10, max: 30)',
          },
        },
      }),
      execute: async (params: { days?: number; projected_years?: number; limit?: number }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        const historyDays = Math.min(Math.max(params.days ?? 180, 30), 365)
        const projectedYears = Math.min(Math.max(params.projected_years ?? 2, 1), 5)
        const topLimit = Math.min(Math.max(params.limit ?? 10, 1), 30)

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          // 1. Fetch orders in the analysis period
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - historyDays)
          startDate.setHours(0, 0, 0, 0)

          const allOrders: Array<{
            customer_email: string | null
            customer_name: string | null
            total: string
            created_at: string
            products: Array<{ product_id: number | null; quantity: string; price: string }>
          }> = []
          let page = 1
          try {
            while (true) {
              const orders = await client.getOrders(page, 200, {
                created_at_min: startDate.toISOString(),
              })
              for (const o of orders) {
                allOrders.push({
                  customer_email: o.customer?.email ?? null,
                  customer_name: o.customer?.name ?? null,
                  total: o.total ?? '0',
                  created_at: o.created_at,
                  products: (o.products ?? []).map((p) => ({
                    product_id: p.product_id,
                    quantity: String(p.quantity ?? '1'),
                    price: String(p.price ?? '0'),
                  })),
                })
              }
              if (orders.length < 200) break
              page++
            }
          } catch {
            // Nuvemshop returns 404 when there are no orders
          }

          if (allOrders.length === 0) {
            return {
              message: `Nenhum pedido nos últimos ${historyDays} dias. Preciso de histórico de vendas pra estimar LTV.`,
              pedidos_analisados: 0,
            }
          }

          // 2. Group orders by customer email
          const customerMap = new Map<
            string,
            {
              name: string
              email: string
              orderDates: string[]
              totalSpent: number
              orderCount: number
              productRevenue: Map<number, number>
            }
          >()

          for (const order of allOrders) {
            if (!order.customer_email) continue
            const key = order.customer_email.toLowerCase()
            if (!customerMap.has(key)) {
              customerMap.set(key, {
                name: order.customer_name ?? order.customer_email,
                email: order.customer_email,
                orderDates: [],
                totalSpent: 0,
                orderCount: 0,
                productRevenue: new Map(),
              })
            }
            const cust = customerMap.get(key)!
            cust.orderDates.push(order.created_at)
            cust.totalSpent += parseFloat(order.total) || 0
            cust.orderCount++
            if (order.customer_name) cust.name = order.customer_name

            for (const p of order.products) {
              if (p.product_id) {
                const qty = parseInt(p.quantity, 10) || 1
                const price = parseFloat(p.price) || 0
                cust.productRevenue.set(
                  p.product_id,
                  (cust.productRevenue.get(p.product_id) ?? 0) + qty * price
                )
              }
            }
          }

          if (customerMap.size === 0) {
            return {
              message: `${allOrders.length} pedidos encontrados, mas nenhum com email de cliente.`,
              pedidos_analisados: allOrders.length,
            }
          }

          const customers = [...customerMap.values()]

          // 3. Calculate RFM scores
          const now = new Date()
          const recencyValues = customers.map((c) => {
            const lastOrder = c.orderDates
              .map((d) => new Date(d).getTime())
              .sort((a, b) => b - a)[0]
            return Math.round((now.getTime() - lastOrder) / (1000 * 60 * 60 * 24))
          })
          const frequencyValues = customers.map((c) => c.orderCount)
          const monetaryValues = customers.map((c) => c.totalSpent)

          const rScores = calculateQuintiles(recencyValues, false)
          const fScores = calculateQuintiles(frequencyValues, true)
          const mScores = calculateQuintiles(monetaryValues, true)

          // 4. Fetch cost_price for profit-based LTV
          const { data: storeProducts } = await supabase
            .from('store_products')
            .select('external_id, cost_price')
            .eq('store_id', storeId)
            .not('cost_price', 'is', null)

          const costMap = new Map<string, number>()
          if (storeProducts) {
            for (const sp of storeProducts) {
              if (sp.external_id && sp.cost_price != null) {
                costMap.set(String(sp.external_id), Number(sp.cost_price))
              }
            }
          }
          const hasCostData = costMap.size > 0

          // 5. Calculate LTV per customer
          const annualizationFactor = 365 / historyDays
          const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)

          type LtvCustomer = {
            name: string
            email: string
            segment: string
            orderCount: number
            totalSpent: number
            avgOrderValue: number
            purchasesPerYear: number
            ltvRevenue: number
            ltvProfit: number | null
          }

          const ltvCustomers: LtvCustomer[] = customers.map((c, i) => {
            const segment = mapRfmSegment(rScores[i], fScores[i], mScores[i])
            const avgOrderValue = c.totalSpent / c.orderCount
            const purchasesPerYear = c.orderCount * annualizationFactor
            const ltvRevenue = avgOrderValue * purchasesPerYear * projectedYears

            // Profit LTV: compute weighted margin from products bought
            let ltvProfit: number | null = null
            if (hasCostData) {
              let revenueWithCost = 0
              let profitWithCost = 0
              for (const [pid, rev] of c.productRevenue) {
                const cost = costMap.get(String(pid))
                if (cost != null && cost > 0) {
                  revenueWithCost += rev
                  // Estimate units from revenue/cost to approximate profit
                  const estimatedUnits = rev / cost
                  profitWithCost += rev - estimatedUnits * cost
                }
              }
              if (revenueWithCost > 0) {
                const marginRatio = profitWithCost / revenueWithCost
                ltvProfit = ltvRevenue * Math.max(0, marginRatio)
              }
            }

            return {
              name: c.name,
              email: c.email,
              segment,
              orderCount: c.orderCount,
              totalSpent: c.totalSpent,
              avgOrderValue,
              purchasesPerYear,
              ltvRevenue,
              ltvProfit,
            }
          })

          // 6. Aggregate by segment
          const segmentNames = ['VIP', 'Loyal', 'Promising', 'At Risk', 'Lost', 'New'] as const
          const segmentAgg: Record<
            string,
            { clientes: number; ltvTotal: number; ltvProfitTotal: number; receita: number }
          > = {}
          for (const name of segmentNames) {
            segmentAgg[name] = { clientes: 0, ltvTotal: 0, ltvProfitTotal: 0, receita: 0 }
          }

          for (const c of ltvCustomers) {
            const seg = segmentAgg[c.segment] ?? {
              clientes: 0,
              ltvTotal: 0,
              ltvProfitTotal: 0,
              receita: 0,
            }
            if (!segmentAgg[c.segment]) segmentAgg[c.segment] = seg
            seg.clientes++
            seg.ltvTotal += c.ltvRevenue
            if (c.ltvProfit != null) seg.ltvProfitTotal += c.ltvProfit
            seg.receita += c.totalSpent
          }

          const porSegmento: Record<
            string,
            {
              clientes: number
              ltv_medio: string
              ltv_lucro_medio?: string
              receita_atual: string
              pct_receita: string
            }
          > = {}

          for (const name of segmentNames) {
            const seg = segmentAgg[name]
            if (seg.clientes === 0) continue
            const key = name.toLowerCase().replace(' ', '_')
            porSegmento[key] = {
              clientes: seg.clientes,
              ltv_medio: `R$ ${(seg.ltvTotal / seg.clientes).toFixed(2)}`,
              ...(hasCostData && seg.ltvProfitTotal > 0
                ? {
                    ltv_lucro_medio: `R$ ${(seg.ltvProfitTotal / seg.clientes).toFixed(2)}`,
                  }
                : {}),
              receita_atual: `R$ ${seg.receita.toFixed(2)}`,
              pct_receita:
                totalRevenue > 0 ? `${Math.round((seg.receita / totalRevenue) * 100)}%` : '0%',
            }
          }

          // 7. Top customers by LTV
          const topCustomers = ltvCustomers
            .sort((a, b) => b.ltvRevenue - a.ltvRevenue)
            .slice(0, topLimit)
            .map((c) => ({
              nome: c.name,
              email: c.email,
              pedidos: c.orderCount,
              total_gasto: `R$ ${c.totalSpent.toFixed(2)}`,
              ticket_medio: `R$ ${c.avgOrderValue.toFixed(2)}`,
              ltv_estimado: `R$ ${c.ltvRevenue.toFixed(2)}`,
              ...(c.ltvProfit != null ? { ltv_lucro: `R$ ${c.ltvProfit.toFixed(2)}` } : {}),
              segmento: c.segment,
            }))

          // 8. Distribution bands
          const bands = [
            { label: 'R$ 0–500', min: 0, max: 500 },
            { label: 'R$ 500–1.000', min: 500, max: 1000 },
            { label: 'R$ 1.000–2.500', min: 1000, max: 2500 },
            { label: 'R$ 2.500–5.000', min: 2500, max: 5000 },
            { label: 'R$ 5.000+', min: 5000, max: Infinity },
          ]
          const distribution = bands.map((b) => {
            const count = ltvCustomers.filter(
              (c) => c.ltvRevenue >= b.min && c.ltvRevenue < b.max
            ).length
            return {
              faixa: b.label,
              clientes: count,
              pct:
                ltvCustomers.length > 0
                  ? `${Math.round((count / ltvCustomers.length) * 100)}%`
                  : '0%',
            }
          })

          // 9. Overall metrics
          const avgOrderValue = totalRevenue / allOrders.length
          const avgFrequencyAnnual =
            (customers.reduce((sum, c) => sum + c.orderCount, 0) / customers.length) *
            annualizationFactor
          const avgLtv =
            ltvCustomers.reduce((sum, c) => sum + c.ltvRevenue, 0) / ltvCustomers.length
          const totalLtv = ltvCustomers.reduce((sum, c) => sum + c.ltvRevenue, 0)

          // 10. Action suggestions
          const acoes: string[] = []
          if (segmentAgg['VIP'].clientes > 0) {
            acoes.push(
              `${segmentAgg['VIP'].clientes} clientes VIP com LTV médio de R$ ${(segmentAgg['VIP'].ltvTotal / segmentAgg['VIP'].clientes).toFixed(2)} — programa de fidelidade pode aumentar retenção`
            )
          }
          if (segmentAgg['At Risk'].clientes > 0) {
            acoes.push(
              `${segmentAgg['At Risk'].clientes} clientes Em Risco — reativação pode recuperar R$ ${segmentAgg['At Risk'].ltvTotal.toFixed(2)} em LTV`
            )
          }
          if (segmentAgg['Promising'].clientes > 0) {
            acoes.push(
              `${segmentAgg['Promising'].clientes} clientes Promissores — incentive segunda compra pra aumentar frequência`
            )
          }
          if (hasCostData) {
            const totalLtvProfit = ltvCustomers.reduce((sum, c) => sum + (c.ltvProfit ?? 0), 0)
            if (totalLtvProfit > 0) {
              acoes.push(
                `LTV baseado em lucro: R$ ${totalLtvProfit.toFixed(2)} total — foque em produtos de maior margem`
              )
            }
          } else {
            acoes.push(
              'Cadastre preço de custo nos produtos pra ver o LTV baseado em lucro (não só receita)'
            )
          }

          return {
            resumo: {
              periodo: `Últimos ${historyDays} dias`,
              projecao: `${projectedYears} anos`,
              clientes_analisados: customers.length,
              ticket_medio: `R$ ${avgOrderValue.toFixed(2)}`,
              frequencia_media_anual: `${Math.round(avgFrequencyAnnual * 10) / 10}x`,
              ltv_medio: `R$ ${avgLtv.toFixed(2)}`,
              ltv_total_estimado: `R$ ${totalLtv.toFixed(2)}`,
            },
            por_segmento: porSegmento,
            top_clientes: topCustomers,
            distribuicao: { faixas: distribution },
            acoes_sugeridas: acoes,
          }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_SUGGEST_BUNDLES: {
      description:
        'Identify co-purchased products and suggest kits/combos with pricing. Analyzes multi-product orders to find natural product pairings. Use when user asks "sugira bundles", "kits de produtos", "quais produtos são comprados juntos?", "combinações de produtos", "montar kit", "cross-sell".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Days of order history to analyze (default: 90, max: 365)',
          },
          min_orders: {
            type: 'number',
            description: 'Minimum co-purchases to consider a pair (default: 3, max: 20)',
          },
          limit: {
            type: 'number',
            description: 'Max bundle suggestions to return (default: 10, max: 20)',
          },
        },
      }),
      execute: async (params: { days?: number; min_orders?: number; limit?: number }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        const historyDays = Math.min(Math.max(params.days ?? 90, 30), 365)
        const minOrders = Math.min(Math.max(params.min_orders ?? 3, 2), 20)
        const resultLimit = Math.min(Math.max(params.limit ?? 10, 1), 20)

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          // 1. Fetch orders
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - historyDays)
          startDate.setHours(0, 0, 0, 0)

          const allOrders: Array<{
            products: Array<{
              product_id: number | null
              name: string
              quantity: string
              price: string
            }>
          }> = []
          let page = 1
          try {
            while (true) {
              const orders = await client.getOrders(page, 200, {
                created_at_min: startDate.toISOString(),
              })
              for (const o of orders) {
                allOrders.push({
                  products: (o.products ?? []).map((p) => ({
                    product_id: p.product_id,
                    name: p.name ?? 'Produto',
                    quantity: String(p.quantity ?? '1'),
                    price: String(p.price ?? '0'),
                  })),
                })
              }
              if (orders.length < 200) break
              page++
            }
          } catch {
            // Nuvemshop returns 404 when there are no orders
          }

          if (allOrders.length === 0) {
            return {
              message: `Nenhum pedido nos últimos ${historyDays} dias.`,
              pedidos_analisados: 0,
            }
          }

          // 2. Filter to multi-product orders and collect product info
          const productInfo = new Map<
            number,
            { name: string; totalRevenue: number; orderCount: number }
          >()
          const multiProductOrders: Array<number[]> = []

          for (const order of allOrders) {
            const validProducts = order.products.filter((p) => p.product_id != null)
            const uniqueIds = [...new Set(validProducts.map((p) => p.product_id!))]

            for (const p of validProducts) {
              const pid = p.product_id!
              if (!productInfo.has(pid)) {
                productInfo.set(pid, { name: p.name, totalRevenue: 0, orderCount: 0 })
              }
              const info = productInfo.get(pid)!
              info.totalRevenue += (parseInt(p.quantity, 10) || 1) * (parseFloat(p.price) || 0)
              info.orderCount++
            }

            if (uniqueIds.length >= 2) {
              // Cap at 6 products per order to avoid O(n^2) explosion
              multiProductOrders.push(uniqueIds.slice(0, 6))
            }
          }

          if (multiProductOrders.length === 0) {
            return {
              message: `${allOrders.length} pedidos encontrados, mas nenhum com 2+ produtos diferentes. Não há combinações para sugerir.`,
              pedidos_analisados: allOrders.length,
              pedidos_multiplos: 0,
            }
          }

          // 3. Build co-occurrence matrix (unordered pairs)
          const pairCounts = new Map<string, number>()
          for (const ids of multiProductOrders) {
            for (let i = 0; i < ids.length; i++) {
              for (let j = i + 1; j < ids.length; j++) {
                const key = ids[i] < ids[j] ? `${ids[i]}:${ids[j]}` : `${ids[j]}:${ids[i]}`
                pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
              }
            }
          }

          // 4. Filter by min_orders and rank
          const qualifiedPairs = [...pairCounts.entries()]
            .filter(([, count]) => count >= minOrders)
            .sort((a, b) => b[1] - a[1])
            .slice(0, resultLimit * 2) // extra to account for enrichment gaps

          if (qualifiedPairs.length === 0) {
            return {
              message: `Nenhuma combinação com ${minOrders}+ pedidos juntos nos últimos ${historyDays} dias. Tente reduzir min_orders ou aumentar o período.`,
              pedidos_analisados: allOrders.length,
              pedidos_multiplos: multiProductOrders.length,
            }
          }

          // 5. Fetch cost/stock from store_products for enrichment
          const involvedIds = new Set<number>()
          for (const [key] of qualifiedPairs) {
            const [a, b] = key.split(':').map(Number)
            involvedIds.add(a)
            involvedIds.add(b)
          }

          const { data: dbProducts } = await supabase
            .from('store_products')
            .select('external_id, name, price, cost_price, stock_quantity')
            .eq('store_id', storeId)
            .in('external_id', [...involvedIds].map(String))

          const enrichMap = new Map<number, { price: number; cost: number | null; stock: number }>()
          if (dbProducts) {
            for (const sp of dbProducts) {
              enrichMap.set(Number(sp.external_id), {
                price: Number(sp.price ?? 0),
                cost: sp.cost_price != null ? Number(sp.cost_price) : null,
                stock: sp.stock_quantity ?? 0,
              })
            }
          }

          // 6. Lightweight ABC classification for involved products
          const totalRevenueAll = [...productInfo.values()].reduce(
            (sum, p) => sum + p.totalRevenue,
            0
          )
          const rankedProducts = [...productInfo.entries()].sort(
            (a, b) => b[1].totalRevenue - a[1].totalRevenue
          )
          let cumRev = 0
          const abcMap = new Map<number, 'A' | 'B' | 'C'>()
          for (const [pid, info] of rankedProducts) {
            cumRev += info.totalRevenue
            const cumPct = totalRevenueAll > 0 ? (cumRev / totalRevenueAll) * 100 : 0
            if (cumPct <= 80) abcMap.set(pid, 'A')
            else if (cumPct <= 95) abcMap.set(pid, 'B')
            else abcMap.set(pid, 'C')
          }
          if (rankedProducts.length > 0) abcMap.set(rankedProducts[0][0], 'A')

          // 7. Build bundle suggestions
          type BundleProduct = {
            nome: string
            preco: string
            custo?: string
            estoque: number
            classe: string
          }

          const bundles: Array<{
            produtos: BundleProduct[]
            pedidos_juntos: number
            preco_separado: string
            preco_sugerido: string
            economia_cliente: string
            margem_estimada?: string
            tipo: string
          }> = []

          for (const [key, count] of qualifiedPairs) {
            if (bundles.length >= resultLimit) break

            const [idA, idB] = key.split(':').map(Number)
            const infoA = productInfo.get(idA)
            const infoB = productInfo.get(idB)
            if (!infoA || !infoB) continue

            const enrichA = enrichMap.get(idA)
            const enrichB = enrichMap.get(idB)

            const priceA = enrichA?.price ?? 0
            const priceB = enrichB?.price ?? 0
            const totalPrice = priceA + priceB

            if (totalPrice === 0) continue

            const classA = abcMap.get(idA) ?? 'C'
            const classB = abcMap.get(idB) ?? 'C'

            // Classify bundle type
            let tipo: string
            if ((classA === 'A' && classB === 'C') || (classA === 'C' && classB === 'A')) {
              tipo = 'estratégico'
            } else if (classA !== classB) {
              tipo = 'cross-sell'
            } else {
              tipo = 'complementar'
            }

            // Discount: 10% default, 13% for strategic bundles
            const discount = tipo === 'estratégico' ? 0.13 : 0.1
            const suggestedPrice = totalPrice * (1 - discount)

            // Margin calculation
            let marginPct: number | null = null
            const costA = enrichA?.cost ?? null
            const costB = enrichB?.cost ?? null
            if (costA != null && costB != null && suggestedPrice > 0) {
              marginPct =
                Math.round(((suggestedPrice - costA - costB) / suggestedPrice) * 1000) / 10
            }

            bundles.push({
              produtos: [
                {
                  nome: infoA.name,
                  preco: `R$ ${priceA.toFixed(2)}`,
                  ...(costA != null ? { custo: `R$ ${costA.toFixed(2)}` } : {}),
                  estoque: enrichA?.stock ?? 0,
                  classe: classA,
                },
                {
                  nome: infoB.name,
                  preco: `R$ ${priceB.toFixed(2)}`,
                  ...(costB != null ? { custo: `R$ ${costB.toFixed(2)}` } : {}),
                  estoque: enrichB?.stock ?? 0,
                  classe: classB,
                },
              ],
              pedidos_juntos: count,
              preco_separado: `R$ ${totalPrice.toFixed(2)}`,
              preco_sugerido: `R$ ${suggestedPrice.toFixed(2)}`,
              economia_cliente: `R$ ${(totalPrice - suggestedPrice).toFixed(2)} (${Math.round(discount * 100)}%)`,
              ...(marginPct != null ? { margem_estimada: `${marginPct}%` } : {}),
              tipo,
            })
          }

          // 8. Action suggestions
          const acoes: string[] = []
          const strategicBundles = bundles.filter((b) => b.tipo === 'estratégico')
          if (strategicBundles.length > 0) {
            acoes.push(
              `${strategicBundles.length} bundles estratégicos (Classe A + C) — ajudam a girar estoque parado com produtos top`
            )
          }
          const lowStockBundles = bundles.filter((b) =>
            b.produtos.some((p) => p.estoque <= 5 && p.estoque > 0)
          )
          if (lowStockBundles.length > 0) {
            acoes.push(
              `${lowStockBundles.length} bundles têm produtos com estoque baixo — reponha antes de criar o kit`
            )
          }
          if (bundles.length > 0) {
            const avgSavings =
              bundles.reduce((sum, b) => {
                return sum + parseFloat(b.economia_cliente.slice(3).split(' ')[0])
              }, 0) / bundles.length
            acoes.push(
              `Economia média de R$ ${avgSavings.toFixed(2)} por bundle — atrativo para aumentar ticket médio`
            )
          }

          return {
            resumo: {
              periodo: `Últimos ${historyDays} dias`,
              pedidos_analisados: allOrders.length,
              pedidos_multiplos: multiProductOrders.length,
              combinacoes_encontradas: qualifiedPairs.length,
            },
            bundles_sugeridos:
              bundles.length > 0 ? bundles : 'Nenhuma combinação qualificada encontrada',
            acoes_sugeridas:
              acoes.length > 0
                ? acoes
                : ['Poucos pedidos multi-produto — incentive cross-sell na loja'],
          }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_SUGGEST_PRICE: {
      description:
        'Suggest optimal prices based on cost, competitors, and demand. Uses store products, price monitors, price history, and recent orders. Use when user asks "sugestão de preço", "como precificar?", "preço ideal", "ajustar preços", "precificação", "quanto cobrar?".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          strategy: {
            type: 'string',
            enum: ['competitivo', 'margem_alvo', 'baseado_demanda', 'auto'],
            description:
              'Pricing strategy: competitivo (match competitors), margem_alvo (target margin), baseado_demanda (demand-based), auto (picks best per product). Default: auto',
          },
          target_margin: {
            type: 'number',
            description: 'Target margin % for margem_alvo strategy (default: 30, range: 5-80)',
          },
          min_margin: {
            type: 'number',
            description: 'Minimum margin % floor for all suggestions (default: 15, range: 5-50)',
          },
          search: {
            type: 'string',
            description: 'Filter by product name (optional)',
          },
        },
      }),
      execute: async (params: {
        strategy?: string
        target_margin?: number
        min_margin?: number
        search?: string
      }) => {
        const supabase = getClient()

        const strategy = params.strategy ?? 'auto'
        const targetMargin = Math.min(Math.max(params.target_margin ?? 30, 5), 80) / 100
        const minMargin = Math.min(Math.max(params.min_margin ?? 15, 5), 50) / 100

        try {
          // 1. Fetch store_products with cost_price
          let productsQuery = supabase
            .from('store_products')
            .select('id, external_id, name, price, cost_price, stock_quantity')
            .eq('store_id', storeId)
            .not('cost_price', 'is', null)

          if (params.search) {
            productsQuery = productsQuery.ilike('name', `%${params.search}%`)
          }

          const { data: products } = await productsQuery.limit(100)

          if (!products || products.length === 0) {
            return {
              message: params.search
                ? `Nenhum produto com custo cadastrado encontrado para "${params.search}". Cadastre o preço de custo primeiro.`
                : 'Nenhum produto com preço de custo cadastrado. Cadastre o custo dos produtos primeiro.',
            }
          }

          // 2. Fetch active price_monitors linked via own_product_id
          const productIds = products.map((p) => p.id)
          const { data: monitors } = await supabase
            .from('store_price_monitors')
            .select('id, own_product_id, product_name, marketplace, last_price, is_active')
            .eq('store_id', storeId)
            .eq('is_active', true)
            .in('own_product_id', productIds)

          const monitorMap = new Map<
            string,
            Array<{
              monitorId: string
              marketplace: string
              lastPrice: number
              productName: string
            }>
          >()
          if (monitors) {
            for (const m of monitors) {
              if (!m.own_product_id || m.last_price == null) continue
              if (!monitorMap.has(m.own_product_id)) monitorMap.set(m.own_product_id, [])
              monitorMap.get(m.own_product_id)!.push({
                monitorId: m.id,
                marketplace: m.marketplace,
                lastPrice: Number(m.last_price),
                productName: m.product_name,
              })
            }
          }

          // 3. Fetch price_history for trend analysis (last 10 per monitor)
          const monitorIds = monitors?.map((m) => m.id) ?? []
          const trendMap = new Map<string, 'subindo' | 'descendo' | 'estável'>()

          if (monitorIds.length > 0) {
            const { data: history } = await supabase
              .from('store_price_history')
              .select('monitor_id, price, scraped_at')
              .in('monitor_id', monitorIds)
              .order('scraped_at', { ascending: false })
              .limit(monitorIds.length * 10)

            if (history && history.length > 0) {
              const byMonitor = new Map<string, Array<{ price: number; date: string }>>()
              for (const h of history) {
                if (!byMonitor.has(h.monitor_id)) byMonitor.set(h.monitor_id, [])
                byMonitor.get(h.monitor_id)!.push({
                  price: Number(h.price),
                  date: h.scraped_at,
                })
              }

              for (const [mid, points] of byMonitor) {
                if (points.length < 2) {
                  trendMap.set(mid, 'estável')
                  continue
                }
                const newest = points[0].price
                const oldest = points[points.length - 1].price
                const changePct = oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0
                if (changePct > 5) trendMap.set(mid, 'subindo')
                else if (changePct < -5) trendMap.set(mid, 'descendo')
                else trendMap.set(mid, 'estável')
              }
            }
          }

          // 4. Fetch store_orders for sales velocity (last 30 days)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

          const { data: recentOrders } = await supabase
            .from('store_orders')
            .select('items')
            .eq('store_id', storeId)
            .gte('ordered_at', thirtyDaysAgo.toISOString())

          // Build sales velocity by normalized product name
          const salesVelocity = new Map<string, number>()
          if (recentOrders) {
            for (const order of recentOrders) {
              const items = Array.isArray(order.items)
                ? (order.items as Array<{ name?: string; quantity?: string }>)
                : []
              for (const item of items) {
                if (item.name) {
                  const normalizedName = normalizeAccents(item.name)
                  const qty = parseInt(String(item.quantity ?? '1'), 10) || 1
                  salesVelocity.set(normalizedName, (salesVelocity.get(normalizedName) ?? 0) + qty)
                }
              }
            }
          }

          // 5. Generate suggestions per product
          type Suggestion = {
            produto: string
            preco_atual: string
            custo: string
            margem_atual: string
            preco_sugerido: string
            margem_nova: string
            motivo: string
            estrategia: string
            concorrente?: string
            demanda?: string
            confianca: 'alta' | 'média' | 'baixa'
          }

          const suggestions: Suggestion[] = []
          let withMonitor = 0
          let withoutMonitor = 0
          const marginValues: number[] = []

          for (const product of products) {
            const currentPrice = Number(product.price ?? 0)
            const costPrice = Number(product.cost_price)
            if (costPrice <= 0 || currentPrice <= 0) continue

            const currentMargin = (currentPrice - costPrice) / currentPrice
            marginValues.push(currentMargin * 100)

            const monitorData = monitorMap.get(product.id)
            const hasMonitor = monitorData && monitorData.length > 0
            if (hasMonitor) withMonitor++
            else withoutMonitor++

            // Find sales velocity for this product
            const normalizedProductName = normalizeAccents(product.name)
            let demandQty = 0
            for (const [name, qty] of salesVelocity) {
              if (name.includes(normalizedProductName) || normalizedProductName.includes(name)) {
                demandQty += qty
                break
              }
            }
            const demandLevel = demandQty >= 10 ? 'alta' : demandQty >= 3 ? 'média' : 'baixa'

            // Pick strategy
            let chosenStrategy = strategy
            if (strategy === 'auto') {
              if (hasMonitor) chosenStrategy = 'competitivo'
              else if (demandQty >= 5) chosenStrategy = 'baseado_demanda'
              else chosenStrategy = 'margem_alvo'
            }

            let suggestedPrice = currentPrice
            let motivo = ''
            let confidence: 'alta' | 'média' | 'baixa' = 'média'
            let competitorInfo: string | undefined

            if (chosenStrategy === 'competitivo' && hasMonitor) {
              const cheapest = monitorData!.sort((a, b) => a.lastPrice - b.lastPrice)[0]
              const trend = trendMap.get(cheapest.monitorId)
              competitorInfo = `${cheapest.marketplace}: R$ ${cheapest.lastPrice.toFixed(2)}${trend ? ` (${trend})` : ''}`

              if (cheapest.lastPrice < currentPrice) {
                suggestedPrice = cheapest.lastPrice * 0.99
                motivo = `Concorrente mais barato em ${cheapest.marketplace}`
              } else if (cheapest.lastPrice > currentPrice * 1.05) {
                suggestedPrice = currentPrice * 1.03
                motivo = `Preço abaixo do concorrente — margem para aumento`
              } else {
                suggestedPrice = currentPrice
                motivo = 'Preço competitivo com o mercado'
              }
              confidence = 'alta'
            } else if (chosenStrategy === 'baseado_demanda') {
              const stock = product.stock_quantity ?? 0
              if (demandLevel === 'alta' && stock < 20) {
                suggestedPrice = currentPrice * 1.08
                motivo = `Demanda alta (${demandQty} vendas/30d) + estoque baixo (${stock}) — elevar preço`
              } else if (demandLevel === 'baixa' && stock > 50) {
                suggestedPrice = currentPrice * 0.9
                motivo = `Demanda baixa (${demandQty} vendas/30d) + estoque alto (${stock}) — reduzir pra girar`
              } else {
                suggestedPrice = currentPrice
                motivo = 'Demanda e estoque equilibrados'
              }
              confidence = demandQty > 0 ? 'média' : 'baixa'
            } else {
              // margem_alvo
              suggestedPrice = costPrice / (1 - targetMargin)
              motivo = `Margem alvo de ${Math.round(targetMargin * 100)}%`
              confidence = 'alta'
            }

            // Clamp to min_margin floor
            const minPrice = costPrice / (1 - minMargin)
            if (suggestedPrice < minPrice) {
              suggestedPrice = minPrice
              motivo += ` (ajustado para margem mínima de ${Math.round(minMargin * 100)}%)`
            }

            suggestedPrice = Math.round(suggestedPrice * 100) / 100
            const newMargin = suggestedPrice > 0 ? (suggestedPrice - costPrice) / suggestedPrice : 0

            // Skip if no meaningful change
            const priceDiff = Math.abs(suggestedPrice - currentPrice)
            if (priceDiff < 0.5 && chosenStrategy !== 'margem_alvo') continue

            suggestions.push({
              produto: product.name,
              preco_atual: `R$ ${currentPrice.toFixed(2)}`,
              custo: `R$ ${costPrice.toFixed(2)}`,
              margem_atual: `${Math.round(currentMargin * 1000) / 10}%`,
              preco_sugerido: `R$ ${suggestedPrice.toFixed(2)}`,
              margem_nova: `${Math.round(newMargin * 1000) / 10}%`,
              motivo,
              estrategia: chosenStrategy,
              ...(competitorInfo ? { concorrente: competitorInfo } : {}),
              ...(demandQty > 0 ? { demanda: `${demandQty} vendas/30d (${demandLevel})` } : {}),
              confianca: confidence,
            })
          }

          // 6. Categorize opportunities
          const aumentar = suggestions.filter(
            (s) => parseFloat(s.preco_sugerido.slice(3)) > parseFloat(s.preco_atual.slice(3))
          )
          const diminuir = suggestions.filter(
            (s) => parseFloat(s.preco_sugerido.slice(3)) < parseFloat(s.preco_atual.slice(3))
          )
          const manter = products.length - aumentar.length - diminuir.length

          // Sort by biggest price impact first
          suggestions.sort((a, b) => {
            const diffA = Math.abs(
              parseFloat(a.preco_sugerido.slice(3)) - parseFloat(a.preco_atual.slice(3))
            )
            const diffB = Math.abs(
              parseFloat(b.preco_sugerido.slice(3)) - parseFloat(b.preco_atual.slice(3))
            )
            return diffB - diffA
          })

          // 7. Action suggestions
          const acoes: string[] = []
          if (aumentar.length > 0) {
            acoes.push(
              `${aumentar.length} produtos podem subir de preço — oportunidade de receita adicional`
            )
          }
          if (diminuir.length > 0) {
            acoes.push(
              `${diminuir.length} produtos devem baixar preço pra competir ou girar estoque`
            )
          }
          if (withoutMonitor > 0) {
            acoes.push(
              `${withoutMonitor} produtos sem monitor de concorrente — crie monitores pra sugestões mais precisas`
            )
          }
          const avgMargin =
            marginValues.length > 0
              ? marginValues.reduce((a, b) => a + b, 0) / marginValues.length
              : 0
          if (avgMargin < minMargin * 100) {
            acoes.push(
              `Margem média atual (${Math.round(avgMargin)}%) abaixo do mínimo (${Math.round(minMargin * 100)}%) — ajuste urgente`
            )
          }

          return {
            resumo: {
              produtos_analisados: products.length,
              com_monitor: withMonitor,
              sem_monitor: withoutMonitor,
              margem_media_atual: `${Math.round(avgMargin * 10) / 10}%`,
            },
            sugestoes:
              suggestions.length > 0
                ? suggestions.slice(0, 20)
                : 'Todos os produtos com preço adequado — nenhuma alteração sugerida',
            oportunidades: {
              aumentar_preco: aumentar.length,
              diminuir_preco: diminuir.length,
              manter,
            },
            acoes_sugeridas: acoes.length > 0 ? acoes : ['Preços bem calibrados!'],
          }
        } catch (err) {
          return {
            error: `Falha: ${err instanceof Error ? err.message : String(err)}`,
          }
        }
      },
    },

    STORE_PREDICT_CHURN: {
      description:
        'Predict which customers are about to churn (stop buying). Uses order history to calculate a churn risk score based on recency decay, purchase frequency decline, and monetary trend. Use when user asks "previsão de churn", "clientes que vão parar de comprar", "quem vai churnar?", "risco de perder clientes", "clientes esfriando", "retenção de clientes".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Days of order history to analyze (default: 180, range: 30-365)',
          },
          risk_threshold: {
            type: 'number',
            description:
              'Minimum churn risk score (0-100) to include in results (default: 50). Lower = more customers shown.',
          },
          limit: {
            type: 'number',
            description: 'Max customers to return (default: 20, max: 50)',
          },
        },
      }),
      execute: async (params: { days?: number; risk_threshold?: number; limit?: number }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        const historyDays = Math.min(Math.max(params.days ?? 180, 30), 365)
        const riskThreshold = Math.min(Math.max(params.risk_threshold ?? 50, 0), 100)
        const maxResults = Math.min(Math.max(params.limit ?? 20, 1), 50)

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          const startDate = new Date()
          startDate.setDate(startDate.getDate() - historyDays)
          startDate.setHours(0, 0, 0, 0)

          const allOrders: Array<{
            customer_email: string | null
            customer_name: string | null
            total: string
            created_at: string
          }> = []
          let page = 1
          try {
            while (true) {
              const orders = await client.getOrders(page, 200, {
                created_at_min: startDate.toISOString(),
              })
              for (const o of orders) {
                allOrders.push({
                  customer_email: o.customer?.email ?? null,
                  customer_name: o.customer?.name ?? null,
                  total: o.total ?? '0',
                  created_at: o.created_at,
                })
              }
              if (orders.length < 200) break
              page++
            }
          } catch {
            // Nuvemshop returns 404 when no orders
          }

          if (allOrders.length === 0) {
            return {
              message: `Nenhum pedido nos últimos ${historyDays} dias. Preciso de histórico pra prever churn.`,
            }
          }

          // Group by customer
          const customerMap = new Map<
            string,
            {
              name: string
              email: string
              orderDates: number[]
              totals: number[]
            }
          >()

          for (const order of allOrders) {
            if (!order.customer_email) continue
            const key = order.customer_email.toLowerCase()
            if (!customerMap.has(key)) {
              customerMap.set(key, {
                name: order.customer_name ?? order.customer_email,
                email: order.customer_email,
                orderDates: [],
                totals: [],
              })
            }
            const cust = customerMap.get(key)!
            cust.orderDates.push(new Date(order.created_at).getTime())
            cust.totals.push(parseFloat(order.total) || 0)
            if (order.customer_name) cust.name = order.customer_name
          }

          // Need at least 2 orders to predict churn
          const repeatCustomers = [...customerMap.values()].filter((c) => c.orderDates.length >= 2)

          if (repeatCustomers.length === 0) {
            return {
              message:
                'Nenhum cliente com 2+ pedidos no período. Preciso de clientes recorrentes pra prever churn.',
              clientes_unicos: customerMap.size,
            }
          }

          const now = Date.now()
          const dayMs = 1000 * 60 * 60 * 24

          type ChurnResult = {
            nome: string
            email: string
            pedidos: number
            total_gasto: string
            ultimo_pedido: string
            intervalo_medio: string
            dias_atrasado: number
            tendencia_valor: string
            risco_churn: number
            nivel: string
            motivos: string[]
          }

          const churnRisks: ChurnResult[] = []

          for (const cust of repeatCustomers) {
            const sorted = cust.orderDates.sort((a, b) => a - b)
            const sortedTotals = cust.orderDates
              .map((d, i) => ({ d, t: cust.totals[i] }))
              .sort((a, b) => a.d - b.d)
              .map((x) => x.t)

            // 1. Recency decay score (0-40 points)
            // How overdue is the customer vs their average interval?
            const intervals: number[] = []
            for (let i = 1; i < sorted.length; i++) {
              intervals.push((sorted[i] - sorted[i - 1]) / dayMs)
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
            const daysSinceLast = (now - sorted[sorted.length - 1]) / dayMs
            const overdueRatio = avgInterval > 0 ? daysSinceLast / avgInterval : 0
            // overdueRatio > 1 means overdue. Scale: 1.0 = 0pts, 1.5 = 20pts, 2.0+ = 40pts
            const recencyScore = Math.min(Math.max((overdueRatio - 1) * 80, 0), 40)

            // 2. Frequency decline score (0-30 points)
            // Compare frequency in first half vs second half of history
            let freqScore = 0
            if (sorted.length >= 4) {
              const mid = Math.floor(sorted.length / 2)
              const firstHalfSpan = (sorted[mid - 1] - sorted[0]) / dayMs || 1
              const secondHalfSpan = (sorted[sorted.length - 1] - sorted[mid]) / dayMs || 1
              const firstHalfRate = mid / firstHalfSpan
              const secondHalfRate = (sorted.length - mid) / secondHalfSpan
              if (firstHalfRate > 0) {
                const freqDecline = 1 - secondHalfRate / firstHalfRate
                freqScore = Math.min(Math.max(freqDecline * 60, 0), 30)
              }
            }

            // 3. Monetary trend score (0-30 points)
            // Are recent orders smaller than earlier ones?
            let monetaryScore = 0
            if (sortedTotals.length >= 3) {
              const mid = Math.floor(sortedTotals.length / 2)
              const firstHalfAvg = sortedTotals.slice(0, mid).reduce((a, b) => a + b, 0) / mid
              const secondHalfAvg =
                sortedTotals.slice(mid).reduce((a, b) => a + b, 0) / (sortedTotals.length - mid)
              if (firstHalfAvg > 0) {
                const monetaryDecline = 1 - secondHalfAvg / firstHalfAvg
                monetaryScore = Math.min(Math.max(monetaryDecline * 60, 0), 30)
              }
            }

            const totalRisk = Math.round(recencyScore + freqScore + monetaryScore)

            if (totalRisk < riskThreshold) continue

            // Determine trend
            let trend = 'estável'
            if (sortedTotals.length >= 3) {
              const mid = Math.floor(sortedTotals.length / 2)
              const firstAvg = sortedTotals.slice(0, mid).reduce((a, b) => a + b, 0) / mid
              const secondAvg =
                sortedTotals.slice(mid).reduce((a, b) => a + b, 0) / (sortedTotals.length - mid)
              if (secondAvg > firstAvg * 1.1) trend = 'crescente'
              else if (secondAvg < firstAvg * 0.9) trend = 'decrescente'
            }

            const motivos: string[] = []
            if (recencyScore >= 20)
              motivos.push(
                `${Math.round(daysSinceLast)} dias sem comprar (média: ${Math.round(avgInterval)} dias)`
              )
            if (freqScore >= 15) motivos.push('Frequência de compra caindo')
            if (monetaryScore >= 15) motivos.push('Valor dos pedidos diminuindo')

            const totalSpent = cust.totals.reduce((a, b) => a + b, 0)

            churnRisks.push({
              nome: cust.name,
              email: cust.email,
              pedidos: cust.orderDates.length,
              total_gasto: `R$ ${totalSpent.toFixed(2)}`,
              ultimo_pedido: `${Math.round(daysSinceLast)} dias atrás`,
              intervalo_medio: `${Math.round(avgInterval)} dias`,
              dias_atrasado: Math.max(0, Math.round(daysSinceLast - avgInterval)),
              tendencia_valor: trend,
              risco_churn: totalRisk,
              nivel:
                totalRisk >= 80
                  ? 'critico'
                  : totalRisk >= 60
                    ? 'alto'
                    : totalRisk >= 40
                      ? 'moderado'
                      : 'baixo',
              motivos,
            })
          }

          // Sort by risk descending
          churnRisks.sort((a, b) => b.risco_churn - a.risco_churn)

          // Summary stats
          const critico = churnRisks.filter((c) => c.nivel === 'critico')
          const alto = churnRisks.filter((c) => c.nivel === 'alto')
          const moderado = churnRisks.filter((c) => c.nivel === 'moderado')

          const receitaEmRisco = churnRisks.reduce(
            (sum, c) => sum + parseFloat(c.total_gasto.slice(3)),
            0
          )

          const acoes: string[] = []
          if (critico.length > 0) {
            acoes.push(
              `${critico.length} clientes em risco CRÍTICO — ação imediata: cupom agressivo ou contato direto`
            )
          }
          if (alto.length > 0) {
            acoes.push(
              `${alto.length} clientes em risco ALTO — envie campanha de reativação com oferta personalizada`
            )
          }
          if (moderado.length > 0) {
            acoes.push(
              `${moderado.length} clientes em risco MODERADO — email de "sentimos sua falta" com novidades`
            )
          }
          if (receitaEmRisco > 0) {
            acoes.push(`R$ ${receitaEmRisco.toFixed(2)} em receita histórica em risco de churn`)
          }

          return {
            resumo: {
              periodo: `Últimos ${historyDays} dias`,
              pedidos_analisados: allOrders.length,
              clientes_recorrentes: repeatCustomers.length,
              clientes_em_risco: churnRisks.length,
              receita_em_risco: `R$ ${receitaEmRisco.toFixed(2)}`,
              por_nivel: {
                critico: critico.length,
                alto: alto.length,
                moderado: moderado.length,
              },
            },
            clientes:
              churnRisks.length > 0
                ? churnRisks.slice(0, maxResults)
                : 'Nenhum cliente com risco de churn acima do limiar.',
            acoes_sugeridas:
              acoes.length > 0 ? acoes : ['Boa retenção! Nenhum cliente em risco significativo.'],
          }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_COHORT_ANALYSIS: {
      description:
        'Analyze customer cohorts grouped by first purchase month. Shows retention rates, revenue evolution, and behavior comparison across cohorts. Use when user asks "análise de cohort", "retenção por mês", "clientes de janeiro vs março", "qual mês trouxe melhores clientes?", "cohort analysis", "retenção de clientes por período".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Days of order history to analyze (default: 365, range: 90-365)',
          },
          granularity: {
            type: 'string',
            enum: ['monthly', 'quarterly'],
            description: 'Group cohorts by month or quarter (default: monthly)',
          },
          limit: {
            type: 'number',
            description: 'Max cohorts to return (default: 12)',
          },
        },
      }),
      execute: async (params: { days?: number; granularity?: string; limit?: number }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        const historyDays = Math.min(Math.max(params.days ?? 365, 90), 365)
        const granularity = params.granularity === 'quarterly' ? 'quarterly' : 'monthly'
        const maxCohorts = Math.min(Math.max(params.limit ?? 12, 1), 24)

        try {
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          const startDate = new Date()
          startDate.setDate(startDate.getDate() - historyDays)
          startDate.setHours(0, 0, 0, 0)

          const allOrders: Array<{
            customer_email: string | null
            customer_name: string | null
            total: string
            created_at: string
          }> = []
          let page = 1
          try {
            while (true) {
              const orders = await client.getOrders(page, 200, {
                created_at_min: startDate.toISOString(),
              })
              for (const o of orders) {
                allOrders.push({
                  customer_email: o.customer?.email ?? null,
                  customer_name: o.customer?.name ?? null,
                  total: o.total ?? '0',
                  created_at: o.created_at,
                })
              }
              if (orders.length < 200) break
              page++
            }
          } catch {
            // Nuvemshop returns 404 when no orders
          }

          if (allOrders.length === 0) {
            return {
              message: `Nenhum pedido nos últimos ${historyDays} dias. Preciso de histórico pra analisar cohorts.`,
            }
          }

          // Group orders by customer → find first purchase date
          const customerMap = new Map<
            string,
            {
              name: string
              orders: Array<{ date: Date; total: number }>
            }
          >()

          for (const order of allOrders) {
            if (!order.customer_email) continue
            const key = order.customer_email.toLowerCase()
            if (!customerMap.has(key)) {
              customerMap.set(key, {
                name: order.customer_name ?? order.customer_email,
                orders: [],
              })
            }
            const cust = customerMap.get(key)!
            cust.orders.push({
              date: new Date(order.created_at),
              total: parseFloat(order.total) || 0,
            })
            if (order.customer_name) cust.name = order.customer_name
          }

          // Assign each customer to a cohort based on first purchase
          function getCohortKey(date: Date): string {
            const y = date.getFullYear()
            const m = date.getMonth()
            if (granularity === 'quarterly') {
              const q = Math.floor(m / 3) + 1
              return `${y}-Q${q}`
            }
            return `${y}-${String(m + 1).padStart(2, '0')}`
          }

          function getMonthOffset(from: Date, to: Date): number {
            return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
          }

          type CohortData = {
            key: string
            firstDate: Date
            customers: Array<{
              name: string
              firstOrderDate: Date
              orders: Array<{ date: Date; total: number }>
            }>
          }

          const cohortMap = new Map<string, CohortData>()

          for (const [, cust] of customerMap) {
            cust.orders.sort((a, b) => a.date.getTime() - b.date.getTime())
            const firstOrder = cust.orders[0]
            const cohortKey = getCohortKey(firstOrder.date)

            if (!cohortMap.has(cohortKey)) {
              cohortMap.set(cohortKey, {
                key: cohortKey,
                firstDate: new Date(firstOrder.date.getFullYear(), firstOrder.date.getMonth(), 1),
                customers: [],
              })
            }
            cohortMap.get(cohortKey)!.customers.push({
              name: cust.name,
              firstOrderDate: firstOrder.date,
              orders: cust.orders,
            })
          }

          // Sort cohorts chronologically
          const cohorts = [...cohortMap.values()].sort(
            (a, b) => a.firstDate.getTime() - b.firstDate.getTime()
          )

          if (cohorts.length === 0) {
            return { message: 'Nenhum cohort identificado.' }
          }

          // Build cohort retention and metrics
          const periodLabel = granularity === 'quarterly' ? 'trimestre' : 'mês'
          const periodMultiplier = granularity === 'quarterly' ? 3 : 1

          type CohortOutput = {
            cohort: string
            clientes: number
            receita_total: string
            ticket_medio: string
            pedidos_por_cliente: string
            retencao: Record<string, string>
            pct_recorrentes: string
          }

          const cohortResults: CohortOutput[] = []

          for (const cohort of cohorts.slice(0, maxCohorts)) {
            const totalCustomers = cohort.customers.length
            const allCohortOrders = cohort.customers.flatMap((c) => c.orders)
            const totalRevenue = allCohortOrders.reduce((s, o) => s + o.total, 0)
            const totalOrders = allCohortOrders.length

            // Retention: for each subsequent period, how many customers ordered?
            const retencao: Record<string, string> = {}
            const maxPeriods = Math.min(
              6,
              Math.ceil(getMonthOffset(cohort.firstDate, new Date()) / periodMultiplier)
            )

            let recurrentCustomers = 0
            for (const cust of cohort.customers) {
              if (cust.orders.length > 1) recurrentCustomers++
            }

            for (let p = 1; p <= maxPeriods; p++) {
              const periodStart = p * periodMultiplier
              const periodEnd = (p + 1) * periodMultiplier
              let activeInPeriod = 0
              for (const cust of cohort.customers) {
                const hasOrderInPeriod = cust.orders.some((o) => {
                  const monthOffset = getMonthOffset(cohort.firstDate, o.date)
                  return monthOffset >= periodStart && monthOffset < periodEnd
                })
                if (hasOrderInPeriod) activeInPeriod++
              }
              const rate = totalCustomers > 0 ? (activeInPeriod / totalCustomers) * 100 : 0
              retencao[`${periodLabel}_${p}`] = `${Math.round(rate)}%`
            }

            cohortResults.push({
              cohort: cohort.key,
              clientes: totalCustomers,
              receita_total: `R$ ${totalRevenue.toFixed(2)}`,
              ticket_medio:
                totalOrders > 0 ? `R$ ${(totalRevenue / totalOrders).toFixed(2)}` : 'R$ 0.00',
              pedidos_por_cliente: (totalOrders / totalCustomers).toFixed(1),
              retencao,
              pct_recorrentes:
                totalCustomers > 0
                  ? `${Math.round((recurrentCustomers / totalCustomers) * 100)}%`
                  : '0%',
            })
          }

          // Summary: best and worst cohorts
          const sortedByRetention = [...cohortResults]
            .filter((c) => c.clientes >= 5)
            .sort((a, b) => {
              const aRec = parseInt(a.pct_recorrentes)
              const bRec = parseInt(b.pct_recorrentes)
              return bRec - aRec
            })

          const sortedByTicket = [...cohortResults]
            .filter((c) => c.clientes >= 5)
            .sort((a, b) => {
              const aT = parseFloat(a.ticket_medio.slice(3))
              const bT = parseFloat(b.ticket_medio.slice(3))
              return bT - aT
            })

          const totalCustomersAll = cohortResults.reduce((s, c) => s + c.clientes, 0)
          const totalRevenueAll = cohortResults.reduce(
            (s, c) => s + parseFloat(c.receita_total.slice(3)),
            0
          )

          const acoes: string[] = []
          if (sortedByRetention.length > 0) {
            acoes.push(
              `Cohort ${sortedByRetention[0].cohort} tem melhor retenção (${sortedByRetention[0].pct_recorrentes} recorrentes) — analise o que foi feito nesse período`
            )
          }
          if (sortedByRetention.length > 1) {
            const worst = sortedByRetention[sortedByRetention.length - 1]
            acoes.push(
              `Cohort ${worst.cohort} tem pior retenção (${worst.pct_recorrentes} recorrentes) — investigue por quê`
            )
          }
          if (sortedByTicket.length > 0) {
            acoes.push(
              `Cohort ${sortedByTicket[0].cohort} tem maior ticket médio (${sortedByTicket[0].ticket_medio}) — replique a estratégia`
            )
          }

          return {
            resumo: {
              periodo: `Últimos ${historyDays} dias`,
              pedidos_analisados: allOrders.length,
              clientes_unicos: customerMap.size,
              cohorts_identificados: cohortResults.length,
              granularidade: granularity === 'quarterly' ? 'trimestral' : 'mensal',
              receita_total: `R$ ${totalRevenueAll.toFixed(2)}`,
              clientes_total: totalCustomersAll,
            },
            cohorts: cohortResults,
            acoes_sugeridas: acoes.length > 0 ? acoes : ['Cohorts consistentes — boa retenção!'],
          }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_MARKDOWN_OPTIMIZATION: {
      description:
        'Identify slow-moving inventory and suggest optimal markdowns (discounts) to clear stock while preserving margin. Crosses stock levels, sales velocity, days of stock, and cost price. Use when user asks "liquidação", "queima de estoque", "produtos parados", "markdown", "desconto pra girar estoque", "estoque encalhado", "como limpar estoque?".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Days of sales history to analyze velocity (default: 60, range: 14-180)',
          },
          min_days_of_stock: {
            type: 'number',
            description:
              'Minimum days of stock to flag as slow-moving (default: 90). Products with more days of stock than this are candidates.',
          },
          max_discount_pct: {
            type: 'number',
            description:
              'Maximum discount % to suggest (default: 50, range: 10-70). Will never suggest below cost.',
          },
          limit: {
            type: 'number',
            description: 'Max products to return (default: 20)',
          },
        },
      }),
      execute: async (params: {
        days?: number
        min_days_of_stock?: number
        max_discount_pct?: number
        limit?: number
      }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        const velocityDays = Math.min(Math.max(params.days ?? 60, 14), 180)
        const minDaysOfStock = Math.max(params.min_days_of_stock ?? 90, 14)
        const maxDiscountPct = Math.min(Math.max(params.max_discount_pct ?? 50, 10), 70) / 100
        const maxResults = Math.min(Math.max(params.limit ?? 20, 1), 50)

        try {
          // 1. Fetch products with stock and cost
          const { data: products } = await supabase
            .from('store_products')
            .select('id, external_id, name, price, cost_price, stock_quantity')
            .eq('store_id', storeId)
            .gt('stock_quantity', 0)

          if (!products || products.length === 0) {
            return { message: 'Nenhum produto com estoque encontrado.' }
          }

          // 2. Fetch recent orders for sales velocity
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          const startDate = new Date()
          startDate.setDate(startDate.getDate() - velocityDays)
          startDate.setHours(0, 0, 0, 0)

          const allOrders: Array<{
            items: Array<{ product_id: string; quantity: number; price: string; name: string }>
            created_at: string
          }> = []
          let page = 1
          try {
            while (true) {
              const orders = await client.getOrders(page, 200, {
                created_at_min: startDate.toISOString(),
              })
              for (const o of orders) {
                const items = (o.products ?? []).map((p) => ({
                  product_id: String(p.product_id ?? ''),
                  quantity: parseInt(String(p.quantity)) || 1,
                  price: p.price ?? '0',
                  name: p.name ?? '',
                }))
                allOrders.push({ items, created_at: o.created_at })
              }
              if (orders.length < 200) break
              page++
            }
          } catch {
            // no orders
          }

          // 3. Calculate sales velocity per product (by external_id match)
          const salesMap = new Map<string, { unitsSold: number; revenue: number }>()
          for (const order of allOrders) {
            for (const item of order.items) {
              if (!item.product_id) continue
              const key = item.product_id
              if (!salesMap.has(key)) salesMap.set(key, { unitsSold: 0, revenue: 0 })
              const s = salesMap.get(key)!
              s.unitsSold += item.quantity
              s.revenue += (parseFloat(item.price) || 0) * item.quantity
            }
          }

          // Also build name-based sales map for products without external_id match
          const salesByName = new Map<string, { unitsSold: number; revenue: number }>()
          for (const order of allOrders) {
            for (const item of order.items) {
              const nameKey = normalizeAccents(item.name)
              if (!nameKey) continue
              if (!salesByName.has(nameKey)) salesByName.set(nameKey, { unitsSold: 0, revenue: 0 })
              const s = salesByName.get(nameKey)!
              s.unitsSold += item.quantity
              s.revenue += (parseFloat(item.price) || 0) * item.quantity
            }
          }

          // 4. Evaluate each product
          type MarkdownCandidate = {
            produto: string
            preco_atual: string
            custo: string | null
            estoque: number
            vendas_periodo: number
            velocidade_diaria: string
            dias_de_estoque: number | string
            margem_atual: string | null
            desconto_sugerido: string
            preco_sugerido: string
            margem_apos_desconto: string | null
            urgencia: string
            motivo: string
          }

          const candidates: MarkdownCandidate[] = []

          for (const product of products) {
            const stock = product.stock_quantity ?? 0
            if (stock <= 0) continue

            const price = parseFloat(String(product.price)) || 0
            const cost = product.cost_price ? parseFloat(String(product.cost_price)) : null

            // Find sales velocity
            const extSales = salesMap.get(String(product.external_id))
            const nameSales = salesByName.get(normalizeAccents(product.name ?? ''))
            const sales = extSales ?? nameSales ?? { unitsSold: 0, revenue: 0 }

            const dailyVelocity = sales.unitsSold / velocityDays
            const daysOfStock = dailyVelocity > 0 ? Math.round(stock / dailyVelocity) : Infinity

            // Only include if days of stock exceeds threshold
            if (daysOfStock !== Infinity && daysOfStock < minDaysOfStock) continue
            // Include zero-sale products always (infinite stock days)
            if (daysOfStock !== Infinity && daysOfStock < minDaysOfStock) continue

            // Calculate discount based on urgency
            let discountPct: number
            let urgency: string

            if (sales.unitsSold === 0) {
              // Zero sales — max discount
              discountPct = maxDiscountPct
              urgency = 'critica'
            } else if (daysOfStock > minDaysOfStock * 3) {
              discountPct = Math.min(maxDiscountPct, 0.4)
              urgency = 'alta'
            } else if (daysOfStock > minDaysOfStock * 2) {
              discountPct = Math.min(maxDiscountPct, 0.3)
              urgency = 'media'
            } else {
              discountPct = Math.min(maxDiscountPct, 0.2)
              urgency = 'baixa'
            }

            // Ensure we never go below cost
            let suggestedPrice = price * (1 - discountPct)
            if (cost !== null && suggestedPrice < cost) {
              suggestedPrice = cost * 1.05 // 5% above cost minimum
              discountPct = price > 0 ? 1 - suggestedPrice / price : 0
            }

            // Skip if no meaningful discount
            if (discountPct < 0.05) continue

            const currentMargin = cost !== null && price > 0 ? ((price - cost) / price) * 100 : null
            const newMargin =
              cost !== null && suggestedPrice > 0
                ? ((suggestedPrice - cost) / suggestedPrice) * 100
                : null

            const motivo =
              sales.unitsSold === 0
                ? `Sem vendas em ${velocityDays} dias com ${stock} unidades em estoque`
                : `${Math.round(daysOfStock as number)} dias de estoque (velocidade: ${dailyVelocity.toFixed(1)} un/dia)`

            candidates.push({
              produto: product.name ?? 'Sem nome',
              preco_atual: `R$ ${price.toFixed(2)}`,
              custo: cost !== null ? `R$ ${cost.toFixed(2)}` : null,
              estoque: stock,
              vendas_periodo: sales.unitsSold,
              velocidade_diaria: `${dailyVelocity.toFixed(1)} un/dia`,
              dias_de_estoque: daysOfStock === Infinity ? 'sem vendas' : Math.round(daysOfStock),
              margem_atual: currentMargin !== null ? `${Math.round(currentMargin)}%` : null,
              desconto_sugerido: `${Math.round(discountPct * 100)}%`,
              preco_sugerido: `R$ ${suggestedPrice.toFixed(2)}`,
              margem_apos_desconto: newMargin !== null ? `${Math.round(newMargin)}%` : null,
              urgencia: urgency,
              motivo,
            })
          }

          // Sort by urgency (critica > alta > media > baixa), then by stock value desc
          const urgencyOrder: Record<string, number> = {
            critica: 0,
            alta: 1,
            media: 2,
            baixa: 3,
          }
          candidates.sort((a, b) => {
            const urgDiff = (urgencyOrder[a.urgencia] ?? 4) - (urgencyOrder[b.urgencia] ?? 4)
            if (urgDiff !== 0) return urgDiff
            return (
              b.estoque * parseFloat(b.preco_atual.slice(3)) -
              a.estoque * parseFloat(a.preco_atual.slice(3))
            )
          })

          // Summary
          const totalStockValue = candidates.reduce(
            (s, c) => s + c.estoque * parseFloat(c.preco_atual.slice(3)),
            0
          )
          const potentialRecovery = candidates.reduce(
            (s, c) => s + c.estoque * parseFloat(c.preco_sugerido.slice(3)),
            0
          )
          const critica = candidates.filter((c) => c.urgencia === 'critica').length
          const alta = candidates.filter((c) => c.urgencia === 'alta').length

          const acoes: string[] = []
          if (critica > 0) {
            acoes.push(
              `${critica} produtos sem NENHUMA venda — considere desconto agressivo ou remoção do catálogo`
            )
          }
          if (alta > 0) {
            acoes.push(`${alta} produtos com estoque muito alto — promoção urgente recomendada`)
          }
          if (totalStockValue > 0) {
            acoes.push(
              `R$ ${totalStockValue.toFixed(2)} parado em estoque lento → R$ ${potentialRecovery.toFixed(2)} recuperável com markdown`
            )
          }
          if (candidates.length === 0) {
            acoes.push('Nenhum produto encalhado! Estoque girando bem.')
          }

          return {
            resumo: {
              periodo_velocidade: `Últimos ${velocityDays} dias`,
              produtos_com_estoque: products.length,
              candidatos_markdown: candidates.length,
              valor_estoque_lento: `R$ ${totalStockValue.toFixed(2)}`,
              receita_potencial: `R$ ${potentialRecovery.toFixed(2)}`,
              por_urgencia: {
                critica,
                alta,
                media: candidates.filter((c) => c.urgencia === 'media').length,
                baixa: candidates.filter((c) => c.urgencia === 'baixa').length,
              },
            },
            sugestoes:
              candidates.length > 0
                ? candidates.slice(0, maxResults)
                : 'Nenhum produto precisa de markdown — estoque saudável!',
            acoes_sugeridas: acoes,
          }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_SIMULATE_ELASTICITY: {
      description:
        'Simulate price elasticity for products. Estimates how a price change would impact sales volume based on historical price variations and order data. Use when user asks "elasticidade", "se eu subir o preço", "se baixar o preço", "impacto de preço", "simulação de preço", "quanto vou vender se mudar o preço?".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Days of history to analyze (default: 180, range: 30-365)',
          },
          price_change_pct: {
            type: 'number',
            description:
              'Price change to simulate in % (e.g. 10 for +10%, -15 for -15%). Default: 10',
          },
          search: {
            type: 'string',
            description: 'Filter by product name (optional)',
          },
          limit: {
            type: 'number',
            description: 'Max products to return (default: 15)',
          },
        },
      }),
      execute: async (params: {
        days?: number
        price_change_pct?: number
        search?: string
        limit?: number
      }) => {
        const supabase = getClient()
        const { data: store } = await supabase
          .from('stores')
          .select('platform, platform_store_id, platform_access_token')
          .eq('id', storeId)
          .single()

        if (
          store?.platform !== 'nuvemshop' ||
          !store.platform_store_id ||
          !store.platform_access_token
        ) {
          return { error: 'Store not connected to Nuvemshop' }
        }

        const historyDays = Math.min(Math.max(params.days ?? 180, 30), 365)
        const priceChangePct = params.price_change_pct ?? 10
        const maxResults = Math.min(Math.max(params.limit ?? 15, 1), 30)

        try {
          // 1. Fetch products
          let productsQuery = supabase
            .from('store_products')
            .select('id, external_id, name, price, cost_price, stock_quantity')
            .eq('store_id', storeId)

          if (params.search) {
            productsQuery = productsQuery.ilike('name', `%${params.search}%`)
          }

          const { data: products } = await productsQuery

          if (!products || products.length === 0) {
            return { message: 'Nenhum produto encontrado.' }
          }

          // 2. Fetch price history from monitors
          const { data: monitors } = await supabase
            .from('store_price_monitors')
            .select('id, product_name, own_product_id, last_price')
            .eq('store_id', storeId)
            .eq('is_active', true)

          // Fetch price history for all monitors
          const monitorIds = (monitors ?? []).map((m) => m.id)
          let priceHistory: Array<{
            monitor_id: string
            price: number
            scraped_at: string
          }> = []
          if (monitorIds.length > 0) {
            const { data: history } = await supabase
              .from('store_price_history')
              .select('monitor_id, price, scraped_at')
              .in('monitor_id', monitorIds)
              .order('scraped_at', { ascending: true })
            priceHistory = (history ?? []).map((h) => ({
              monitor_id: h.monitor_id,
              price: parseFloat(String(h.price)) || 0,
              scraped_at: h.scraped_at,
            }))
          }

          // 3. Fetch orders for sales data
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

          const startDate = new Date()
          startDate.setDate(startDate.getDate() - historyDays)
          startDate.setHours(0, 0, 0, 0)

          const allOrders: Array<{
            items: Array<{ product_id: string; quantity: number; price: string; name: string }>
            created_at: string
          }> = []
          let page = 1
          try {
            while (true) {
              const orders = await client.getOrders(page, 200, {
                created_at_min: startDate.toISOString(),
              })
              for (const o of orders) {
                const items = (o.products ?? []).map((p) => ({
                  product_id: String(p.product_id ?? ''),
                  quantity: parseInt(String(p.quantity)) || 1,
                  price: p.price ?? '0',
                  name: p.name ?? '',
                }))
                allOrders.push({ items, created_at: o.created_at })
              }
              if (orders.length < 200) break
              page++
            }
          } catch {
            // no orders
          }

          // 4. Build weekly sales data per product
          type WeeklySales = { weekStart: number; units: number; avgPrice: number }

          const productSalesMap = new Map<
            string,
            { byWeek: Map<number, { units: number; priceSum: number; count: number }> }
          >()

          const weekMs = 7 * 24 * 60 * 60 * 1000

          for (const order of allOrders) {
            const orderTime = new Date(order.created_at).getTime()
            const weekStart = Math.floor(orderTime / weekMs) * weekMs

            for (const item of order.items) {
              if (!item.product_id) continue
              const key = item.product_id
              if (!productSalesMap.has(key)) {
                productSalesMap.set(key, { byWeek: new Map() })
              }
              const pw = productSalesMap.get(key)!.byWeek
              if (!pw.has(weekStart)) pw.set(weekStart, { units: 0, priceSum: 0, count: 0 })
              const w = pw.get(weekStart)!
              w.units += item.quantity
              w.priceSum += (parseFloat(item.price) || 0) * item.quantity
              w.count += item.quantity
            }
          }

          // Also index by name
          const productSalesByName = new Map<
            string,
            { byWeek: Map<number, { units: number; priceSum: number; count: number }> }
          >()
          for (const order of allOrders) {
            const orderTime = new Date(order.created_at).getTime()
            const weekStart = Math.floor(orderTime / weekMs) * weekMs
            for (const item of order.items) {
              const nameKey = normalizeAccents(item.name)
              if (!nameKey) continue
              if (!productSalesByName.has(nameKey)) {
                productSalesByName.set(nameKey, { byWeek: new Map() })
              }
              const pw = productSalesByName.get(nameKey)!.byWeek
              if (!pw.has(weekStart)) pw.set(weekStart, { units: 0, priceSum: 0, count: 0 })
              const w = pw.get(weekStart)!
              w.units += item.quantity
              w.priceSum += (parseFloat(item.price) || 0) * item.quantity
              w.count += item.quantity
            }
          }

          // 5. Estimate elasticity per product
          type ElasticityResult = {
            produto: string
            preco_atual: string
            custo: string | null
            vendas_periodo: number
            vendas_semanais_media: string
            elasticidade_estimada: string
            confianca: string
            simulacao: {
              variacao_preco: string
              preco_novo: string
              vendas_estimadas: string
              receita_atual_semanal: string
              receita_nova_semanal: string
              impacto_receita: string
              margem_nova: string | null
            }
          }

          const results: ElasticityResult[] = []

          for (const product of products) {
            const price = parseFloat(String(product.price)) || 0
            if (price <= 0) continue

            const cost = product.cost_price ? parseFloat(String(product.cost_price)) : null

            // Get weekly sales data
            const extData = productSalesMap.get(String(product.external_id))
            const nameData = productSalesByName.get(normalizeAccents(product.name ?? ''))
            const salesData = extData ?? nameData

            if (!salesData || salesData.byWeek.size === 0) continue

            const weeks: WeeklySales[] = [...salesData.byWeek.entries()]
              .map(([weekStart, data]) => ({
                weekStart,
                units: data.units,
                avgPrice: data.count > 0 ? data.priceSum / data.count : price,
              }))
              .sort((a, b) => a.weekStart - b.weekStart)

            const totalUnits = weeks.reduce((s, w) => s + w.units, 0)
            const avgWeeklyUnits = totalUnits / weeks.length

            // Estimate elasticity from price variance in the data
            // If we have price variation across weeks, use regression-like approach
            let elasticity = -1.2 // default assumption
            let confidence = 'estimativa_padrao'

            // Check if there's meaningful price variation
            const prices = weeks.map((w) => w.avgPrice)
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)
            const priceVariation = maxPrice > 0 ? (maxPrice - minPrice) / maxPrice : 0

            if (priceVariation > 0.05 && weeks.length >= 4) {
              // Enough variation — calculate point elasticity from data
              const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
              const avgQty = avgWeeklyUnits

              // Simple elasticity: % change in Q / % change in P
              // Use pairs of adjacent weeks with different prices
              const elasticities: number[] = []
              for (let i = 1; i < weeks.length; i++) {
                const pChange = (weeks[i].avgPrice - weeks[i - 1].avgPrice) / weeks[i - 1].avgPrice
                const qChange = (weeks[i].units - weeks[i - 1].units) / (weeks[i - 1].units || 1)
                if (Math.abs(pChange) > 0.02) {
                  // meaningful price change
                  const e = qChange / pChange
                  // Cap extreme values
                  if (e >= -10 && e <= 2) elasticities.push(e)
                }
              }

              if (elasticities.length >= 2) {
                // Median for robustness
                elasticities.sort((a, b) => a - b)
                const mid = Math.floor(elasticities.length / 2)
                elasticity =
                  elasticities.length % 2 === 0
                    ? (elasticities[mid - 1] + elasticities[mid]) / 2
                    : elasticities[mid]
                confidence = 'baseada_em_dados'
              } else if (elasticities.length === 1) {
                elasticity = elasticities[0]
                confidence = 'dados_limitados'
              }
            }

            // Also check competitor price history for the product
            if (monitors && monitors.length > 0) {
              const linkedMonitor = monitors.find((m) => m.own_product_id === product.id)
              if (linkedMonitor) {
                const monitorHistory = priceHistory.filter((h) => h.monitor_id === linkedMonitor.id)
                if (monitorHistory.length >= 3 && confidence === 'estimativa_padrao') {
                  // Competitor prices available — adjust elasticity toward -1.5 (more elastic)
                  elasticity = -1.5
                  confidence = 'ajustada_por_concorrencia'
                }
              }
            }

            // 6. Simulate price change
            const pctChange = priceChangePct / 100
            const newPrice = price * (1 + pctChange)
            const estimatedQtyChange = pctChange * elasticity
            const newWeeklyUnits = Math.max(0, avgWeeklyUnits * (1 + estimatedQtyChange))

            const currentWeeklyRevenue = avgWeeklyUnits * price
            const newWeeklyRevenue = newWeeklyUnits * newPrice
            const revenueImpact =
              currentWeeklyRevenue > 0
                ? ((newWeeklyRevenue - currentWeeklyRevenue) / currentWeeklyRevenue) * 100
                : 0

            const newMargin =
              cost !== null && newPrice > 0 ? ((newPrice - cost) / newPrice) * 100 : null

            results.push({
              produto: product.name ?? 'Sem nome',
              preco_atual: `R$ ${price.toFixed(2)}`,
              custo: cost !== null ? `R$ ${cost.toFixed(2)}` : null,
              vendas_periodo: totalUnits,
              vendas_semanais_media: avgWeeklyUnits.toFixed(1),
              elasticidade_estimada: elasticity.toFixed(2),
              confianca: confidence,
              simulacao: {
                variacao_preco: `${priceChangePct > 0 ? '+' : ''}${priceChangePct}%`,
                preco_novo: `R$ ${newPrice.toFixed(2)}`,
                vendas_estimadas: `${newWeeklyUnits.toFixed(1)} un/semana`,
                receita_atual_semanal: `R$ ${currentWeeklyRevenue.toFixed(2)}`,
                receita_nova_semanal: `R$ ${newWeeklyRevenue.toFixed(2)}`,
                impacto_receita: `${revenueImpact > 0 ? '+' : ''}${revenueImpact.toFixed(1)}%`,
                margem_nova: newMargin !== null ? `${Math.round(newMargin)}%` : null,
              },
            })
          }

          // Sort by revenue impact
          results.sort((a, b) => {
            const aImpact = parseFloat(a.simulacao.impacto_receita)
            const bImpact = parseFloat(b.simulacao.impacto_receita)
            return bImpact - aImpact
          })

          // Summary
          const withData = results.filter((r) => r.confianca === 'baseada_em_dados').length
          const withLimited = results.filter((r) => r.confianca === 'dados_limitados').length
          const withDefault = results.filter(
            (r) =>
              r.confianca === 'estimativa_padrao' || r.confianca === 'ajustada_por_concorrencia'
          ).length

          const gainers = results.filter((r) => parseFloat(r.simulacao.impacto_receita) > 0)
          const losers = results.filter((r) => parseFloat(r.simulacao.impacto_receita) < 0)

          const acoes: string[] = []
          if (priceChangePct > 0 && gainers.length > 0) {
            acoes.push(
              `${gainers.length} produtos ganhariam receita com aumento de ${priceChangePct}% — demanda inelástica`
            )
          }
          if (priceChangePct > 0 && losers.length > 0) {
            acoes.push(
              `${losers.length} produtos perderiam receita — clientes sensíveis a preço nesses itens`
            )
          }
          if (priceChangePct < 0 && gainers.length > 0) {
            acoes.push(
              `${gainers.length} produtos ganhariam receita com desconto de ${Math.abs(priceChangePct)}% — vale a promoção`
            )
          }
          if (withDefault > results.length * 0.5) {
            acoes.push(
              'Maioria das estimativas usa elasticidade padrão — mais histórico de variação de preço melhora a precisão'
            )
          }

          return {
            resumo: {
              periodo: `Últimos ${historyDays} dias`,
              variacao_simulada: `${priceChangePct > 0 ? '+' : ''}${priceChangePct}%`,
              produtos_analisados: results.length,
              confianca: {
                baseada_em_dados: withData,
                dados_limitados: withLimited,
                estimativa_padrao: withDefault,
              },
              ganhariam_receita: gainers.length,
              perderiam_receita: losers.length,
            },
            simulacoes:
              results.length > 0
                ? results.slice(0, maxResults)
                : 'Nenhum produto com dados de vendas suficientes para simular.',
            acoes_sugeridas:
              acoes.length > 0
                ? acoes
                : ['Dados insuficientes para sugestões — acumule mais histórico de vendas.'],
          }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    // ── Supplier Management Tools ────────────────────────────────────────

    STORE_MANAGE_SUPPLIERS: {
      description:
        'Manage store suppliers (CRUD). Create, list, update, or deactivate suppliers. Use when user asks about suppliers, fornecedores, or wants to register a new supplier.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'create', 'update', 'deactivate'],
            description: 'Action to perform',
          },
          id: { type: 'string', description: 'Supplier ID (for update/deactivate)' },
          name: { type: 'string', description: 'Supplier name (for create, or search on list)' },
          contact_email: { type: 'string', description: 'Contact email' },
          contact_phone: { type: 'string', description: 'Contact phone' },
          lead_time_days: {
            type: 'number',
            description: 'Lead time in days (required for create)',
          },
          min_order_value: { type: 'number', description: 'Minimum order value in BRL' },
          payment_terms: { type: 'string', description: 'Payment terms (free text)' },
          notes: { type: 'string', description: 'Notes about the supplier' },
        },
        required: ['action'],
      }),
      execute: async (params: {
        action: 'list' | 'create' | 'update' | 'deactivate'
        id?: string
        name?: string
        contact_email?: string
        contact_phone?: string
        lead_time_days?: number
        min_order_value?: number
        payment_terms?: string
        notes?: string
      }) => {
        try {
          const client = getClient()

          if (params.action === 'list') {
            let query = client
              .from('store_suppliers')
              .select(
                'id, name, contact_email, contact_phone, lead_time_days, min_order_value, payment_terms, notes, is_active, store_id, created_at, updated_at'
              )
              .eq('store_id', storeId)
              .eq('is_active', true)
              .order('name')
            if (params.name) query = query.ilike('name', `%${params.name}%`)
            const { data, error } = await query
            if (error) return { error: `Falha: ${error.message}` }
            if (!data?.length) return { message: 'Nenhum fornecedor encontrado.' }
            return {
              fornecedores: data.map((s) => ({
                id: s.id,
                nome: s.name,
                email: s.contact_email,
                telefone: s.contact_phone,
                lead_time: `${s.lead_time_days} dias`,
                pedido_minimo: s.min_order_value
                  ? `R$ ${Number(s.min_order_value).toFixed(2)}`
                  : null,
                condicoes_pagamento: s.payment_terms,
                notas: s.notes,
              })),
              total: data.length,
            }
          }

          if (params.action === 'create') {
            if (!params.name || !params.lead_time_days) {
              return { error: 'Nome e lead_time_days são obrigatórios para criar fornecedor.' }
            }
            const { data, error } = await client
              .from('store_suppliers')
              .insert({
                store_id: storeId,
                name: params.name,
                contact_email: params.contact_email ?? null,
                contact_phone: params.contact_phone ?? null,
                lead_time_days: params.lead_time_days,
                min_order_value: params.min_order_value ?? null,
                payment_terms: params.payment_terms ?? null,
                notes: params.notes ?? null,
              })
              .select()
              .single()
            if (error) return { error: `Falha ao criar: ${error.message}` }
            return {
              message: `Fornecedor "${data.name}" criado com sucesso.`,
              fornecedor: {
                id: data.id,
                nome: data.name,
                lead_time: `${data.lead_time_days} dias`,
                pedido_minimo: data.min_order_value
                  ? `R$ ${Number(data.min_order_value).toFixed(2)}`
                  : null,
              },
            }
          }

          if (params.action === 'update') {
            let supplierId = params.id
            if (!supplierId && params.name) {
              const { data: found } = await client
                .from('store_suppliers')
                .select('id')
                .eq('store_id', storeId)
                .ilike('name', `%${params.name}%`)
                .limit(1)
                .single()
              if (found) supplierId = found.id
            }
            if (!supplierId) return { error: 'Fornecedor não encontrado. Informe id ou nome.' }
            const updates: Record<string, unknown> = {}
            if (params.name) updates.name = params.name
            if (params.contact_email !== undefined) updates.contact_email = params.contact_email
            if (params.contact_phone !== undefined) updates.contact_phone = params.contact_phone
            if (params.lead_time_days) updates.lead_time_days = params.lead_time_days
            if (params.min_order_value !== undefined)
              updates.min_order_value = params.min_order_value
            if (params.payment_terms !== undefined) updates.payment_terms = params.payment_terms
            if (params.notes !== undefined) updates.notes = params.notes
            const { data, error } = await client
              .from('store_suppliers')
              .update(updates)
              .eq('id', supplierId)
              .eq('store_id', storeId)
              .select()
              .single()
            if (error) return { error: `Falha ao atualizar: ${error.message}` }
            return {
              message: `Fornecedor "${data.name}" atualizado.`,
              fornecedor: { id: data.id, nome: data.name },
            }
          }

          if (params.action === 'deactivate') {
            let supplierId = params.id
            if (!supplierId && params.name) {
              const { data: found } = await client
                .from('store_suppliers')
                .select('id, name')
                .eq('store_id', storeId)
                .ilike('name', `%${params.name}%`)
                .limit(1)
                .single()
              if (found) supplierId = found.id
            }
            if (!supplierId) return { error: 'Fornecedor não encontrado.' }
            const { error } = await client
              .from('store_suppliers')
              .update({ is_active: false })
              .eq('id', supplierId)
              .eq('store_id', storeId)
            if (error) return { error: `Falha ao desativar: ${error.message}` }
            return { message: 'Fornecedor desativado com sucesso.' }
          }

          return { error: 'Ação inválida. Use: list, create, update, deactivate.' }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_LINK_PRODUCT_SUPPLIER: {
      description:
        'Link/unlink products to suppliers with cost price. Use when user says "o fornecedor X fornece o produto Y" or wants to manage product-supplier relationships.',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['link', 'unlink', 'update', 'list'],
            description: 'Action to perform',
          },
          supplier_name: { type: 'string', description: 'Supplier name (resolved to ID)' },
          product_name: { type: 'string', description: 'Product name (resolved to ID)' },
          cost_price: { type: 'number', description: 'Cost price from this supplier' },
          is_preferred: {
            type: 'boolean',
            description: 'Mark as preferred supplier for this product',
          },
        },
        required: ['action'],
      }),
      execute: async (params: {
        action: 'link' | 'unlink' | 'update' | 'list'
        supplier_name?: string
        product_name?: string
        cost_price?: number
        is_preferred?: boolean
      }) => {
        try {
          const client = getClient()

          // Resolve supplier by name
          const resolveSupplier = async (name: string) => {
            const { data } = await client
              .from('store_suppliers')
              .select('id, name')
              .eq('store_id', storeId)
              .eq('is_active', true)
              .ilike('name', `%${name}%`)
              .limit(1)
              .single()
            return data
          }

          // Resolve product by name
          const resolveProduct = async (name: string) => {
            const { data } = await client
              .from('store_products')
              .select('id, name, price, cost_price')
              .eq('store_id', storeId)
              .ilike('name', `%${name}%`)
              .limit(1)
              .single()
            return data
          }

          if (params.action === 'list') {
            if (params.supplier_name) {
              const supplier = await resolveSupplier(params.supplier_name)
              if (!supplier)
                return { error: `Fornecedor "${params.supplier_name}" não encontrado.` }
              const { data: links } = await client
                .from('store_product_suppliers')
                .select('*, store_products!inner(name, price, cost_price)')
                .eq('supplier_id', supplier.id)
              return {
                fornecedor: supplier.name,
                produtos: (links ?? []).map((l) => ({
                  produto: (l as Record<string, unknown>).store_products
                    ? ((l as Record<string, unknown>).store_products as { name: string }).name
                    : 'Desconhecido',
                  custo_fornecedor: l.cost_price ? `R$ ${Number(l.cost_price).toFixed(2)}` : null,
                  preferencial: l.is_preferred,
                  ultima_compra: l.last_order_at,
                })),
                total: links?.length ?? 0,
              }
            }
            if (params.product_name) {
              const product = await resolveProduct(params.product_name)
              if (!product) return { error: `Produto "${params.product_name}" não encontrado.` }
              const { data: links } = await client
                .from('store_product_suppliers')
                .select('*, store_suppliers!inner(name, lead_time_days, min_order_value)')
                .eq('product_id', product.id)
              return {
                produto: product.name,
                fornecedores: (links ?? []).map((l) => ({
                  fornecedor: (l as Record<string, unknown>).store_suppliers
                    ? ((l as Record<string, unknown>).store_suppliers as { name: string }).name
                    : 'Desconhecido',
                  custo: l.cost_price ? `R$ ${Number(l.cost_price).toFixed(2)}` : null,
                  preferencial: l.is_preferred,
                })),
                total: links?.length ?? 0,
              }
            }
            return { error: 'Informe supplier_name ou product_name para listar vínculos.' }
          }

          if (params.action === 'link') {
            if (!params.supplier_name || !params.product_name) {
              return { error: 'supplier_name e product_name são obrigatórios para vincular.' }
            }
            const [supplier, product] = await Promise.all([
              resolveSupplier(params.supplier_name),
              resolveProduct(params.product_name),
            ])
            if (!supplier) return { error: `Fornecedor "${params.supplier_name}" não encontrado.` }
            if (!product) return { error: `Produto "${params.product_name}" não encontrado.` }

            // Upsert: update if already exists
            const { data, error } = await client
              .from('store_product_suppliers')
              .upsert(
                {
                  store_id: storeId,
                  supplier_id: supplier.id,
                  product_id: product.id,
                  cost_price: params.cost_price ?? null,
                  is_preferred: params.is_preferred ?? false,
                },
                { onConflict: 'supplier_id,product_id' }
              )
              .select()
              .single()
            if (error) return { error: `Falha ao vincular: ${error.message}` }

            // If preferred, unset others
            if (params.is_preferred) {
              await client
                .from('store_product_suppliers')
                .update({ is_preferred: false })
                .eq('product_id', product.id)
                .eq('store_id', storeId)
                .neq('id', data.id)
            }

            return {
              message: `Produto "${product.name}" vinculado ao fornecedor "${supplier.name}".`,
              custo: params.cost_price ? `R$ ${params.cost_price.toFixed(2)}` : null,
              preferencial: params.is_preferred ?? false,
            }
          }

          if (params.action === 'unlink') {
            if (!params.supplier_name || !params.product_name) {
              return { error: 'supplier_name e product_name são obrigatórios para desvincular.' }
            }
            const [supplier, product] = await Promise.all([
              resolveSupplier(params.supplier_name),
              resolveProduct(params.product_name),
            ])
            if (!supplier) return { error: `Fornecedor "${params.supplier_name}" não encontrado.` }
            if (!product) return { error: `Produto "${params.product_name}" não encontrado.` }
            const { error } = await client
              .from('store_product_suppliers')
              .delete()
              .eq('supplier_id', supplier.id)
              .eq('product_id', product.id)
              .eq('store_id', storeId)
            if (error) return { error: `Falha ao desvincular: ${error.message}` }
            return { message: `Vínculo entre "${product.name}" e "${supplier.name}" removido.` }
          }

          if (params.action === 'update') {
            if (!params.supplier_name || !params.product_name) {
              return { error: 'supplier_name e product_name são obrigatórios para atualizar.' }
            }
            const [supplier, product] = await Promise.all([
              resolveSupplier(params.supplier_name),
              resolveProduct(params.product_name),
            ])
            if (!supplier) return { error: `Fornecedor "${params.supplier_name}" não encontrado.` }
            if (!product) return { error: `Produto "${params.product_name}" não encontrado.` }
            const updates: Record<string, unknown> = {}
            if (params.cost_price !== undefined) updates.cost_price = params.cost_price
            if (params.is_preferred !== undefined) updates.is_preferred = params.is_preferred
            const { data, error } = await client
              .from('store_product_suppliers')
              .update(updates)
              .eq('supplier_id', supplier.id)
              .eq('product_id', product.id)
              .eq('store_id', storeId)
              .select()
              .single()
            if (error) return { error: `Falha ao atualizar: ${error.message}` }
            if (params.is_preferred) {
              await client
                .from('store_product_suppliers')
                .update({ is_preferred: false })
                .eq('product_id', product.id)
                .eq('store_id', storeId)
                .neq('id', data.id)
            }
            return { message: `Vínculo atualizado.` }
          }

          return { error: 'Ação inválida. Use: link, unlink, update, list.' }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_SUGGEST_REORDER: {
      description:
        'Suggest products that need reordering based on stock levels, sales velocity, and supplier lead times. Use when user asks "o que preciso comprar?", "reposição", "reorder", or "pedidos pendentes".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Sales history window in days (default: 30, max: 90)',
          },
          urgency: {
            type: 'string',
            enum: ['all', 'critical', 'warning'],
            description: 'Filter by urgency level (default: all)',
          },
          supplier_name: { type: 'string', description: 'Filter by specific supplier name' },
        },
      }),
      execute: async (params: {
        days?: number
        urgency?: 'all' | 'critical' | 'warning'
        supplier_name?: string
      }) => {
        try {
          const client = getClient()
          const days = Math.min(Math.max(params.days ?? 30, 7), 90)
          const urgencyFilter = params.urgency ?? 'all'

          // Get store credentials for API access
          const { data: store } = await client
            .from('stores')
            .select('platform_store_id, platform_access_token')
            .eq('id', storeId)
            .single()
          if (!store?.platform_store_id || !store?.platform_access_token) {
            return { error: 'Loja não conectada à Nuvemshop.' }
          }

          // Get all product-supplier links with supplier and product data
          let linksQuery = client
            .from('store_product_suppliers')
            .select(
              '*, store_suppliers!inner(id, name, lead_time_days, min_order_value, is_active), store_products!inner(id, name, stock_quantity, price, external_id)'
            )
            .eq('store_id', storeId)
          if (params.supplier_name) {
            linksQuery = linksQuery.ilike('store_suppliers.name', `%${params.supplier_name}%`)
          }
          const { data: links } = await linksQuery
          if (!links?.length) {
            return {
              message:
                'Nenhum produto com fornecedor vinculado. Vincule produtos a fornecedores primeiro.',
            }
          }

          // Filter active suppliers only
          const activeLinks = links.filter((l) => {
            const sup = l.store_suppliers as unknown as { is_active: boolean }
            return sup.is_active
          })

          // Fetch orders from Nuvemshop for sales velocity
          const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
          const nuvemshop = new NuvemshopClient(
            store.platform_store_id,
            store.platform_access_token
          )
          const sinceDate = new Date()
          sinceDate.setDate(sinceDate.getDate() - days)

          // Paginate orders
          const allOrders: Awaited<ReturnType<typeof nuvemshop.getOrders>> = []
          let page = 1
          while (true) {
            const batch = await nuvemshop.getOrders(page, 200, {
              created_at_min: sinceDate.toISOString(),
            })
            allOrders.push(...batch)
            if (batch.length < 200) break
            page++
          }
          const orders = allOrders

          // Calculate daily sales per product (by external_id)
          const salesByExternalId: Record<string, number> = {}
          for (const order of orders) {
            if (order.payment_status !== 'paid') continue
            for (const item of order.products || []) {
              const eid = String(item.product_id)
              salesByExternalId[eid] = (salesByExternalId[eid] || 0) + (Number(item.quantity) || 1)
            }
          }

          // Build reorder suggestions
          type SuggestionItem = {
            produto: string
            estoque_atual: number
            fornecedor: string
            lead_time: string
            media_diaria: string
            dias_estoque: string
            quantidade_sugerida: number
            valor_sugerido: string
            urgencia: string
            pedir_ate: string
          }

          const suggestions: SuggestionItem[] = []

          for (const link of activeLinks) {
            const product = link.store_products as unknown as {
              id: string
              name: string
              stock_quantity: number
              price: number | null
              external_id: string
            }
            const supplier = link.store_suppliers as unknown as {
              id: string
              name: string
              lead_time_days: number
              min_order_value: number | null
            }

            const totalSold = salesByExternalId[product.external_id] || 0
            const avgDaily = totalSold / days
            if (avgDaily <= 0) continue // no sales = no reorder needed

            const daysOfStock = product.stock_quantity / avgDaily
            const reorderPoint = avgDaily * supplier.lead_time_days * 1.2
            const suggestedQty = Math.ceil(avgDaily * 30)
            const costPerUnit = link.cost_price
              ? Number(link.cost_price)
              : product.price
                ? Number(product.price) * 0.6
                : 0
            const suggestedValue = suggestedQty * costPerUnit

            let urgency: string
            if (daysOfStock < supplier.lead_time_days) urgency = 'CRÍTICO'
            else if (daysOfStock < supplier.lead_time_days * 1.5) urgency = 'ATENÇÃO'
            else urgency = 'Saudável'

            if (urgencyFilter === 'critical' && urgency !== 'CRÍTICO') continue
            if (urgencyFilter === 'warning' && urgency === 'Saudável') continue

            const orderByDate = new Date()
            orderByDate.setDate(
              orderByDate.getDate() + Math.max(0, Math.floor(daysOfStock - supplier.lead_time_days))
            )

            suggestions.push({
              produto: product.name,
              estoque_atual: product.stock_quantity,
              fornecedor: supplier.name,
              lead_time: `${supplier.lead_time_days} dias`,
              media_diaria: avgDaily.toFixed(1),
              dias_estoque: daysOfStock.toFixed(1),
              quantidade_sugerida: suggestedQty,
              valor_sugerido: `R$ ${suggestedValue.toFixed(2)}`,
              urgencia: urgency,
              pedir_ate: orderByDate.toISOString().split('T')[0],
            })
          }

          // Sort by urgency (critical first), then days of stock
          const urgencyOrder: Record<string, number> = { CRÍTICO: 0, ATENÇÃO: 1, Saudável: 2 }
          suggestions.sort((a, b) => {
            const ua = urgencyOrder[a.urgencia] ?? 2
            const ub = urgencyOrder[b.urgencia] ?? 2
            if (ua !== ub) return ua - ub
            return parseFloat(a.dias_estoque) - parseFloat(b.dias_estoque)
          })

          if (!suggestions.length) {
            return { message: 'Nenhum produto precisa de reposição no momento. Estoque saudável!' }
          }

          const critical = suggestions.filter((s) => s.urgencia === 'CRÍTICO').length
          const warning = suggestions.filter((s) => s.urgencia === 'ATENÇÃO').length

          return {
            resumo: {
              periodo: `Últimos ${days} dias`,
              produtos_analisados: activeLinks.length,
              criticos: critical,
              atencao: warning,
              saudaveis: suggestions.length - critical - warning,
            },
            sugestoes: suggestions,
            acoes_sugeridas: [
              ...(critical > 0
                ? [`⚠️ ${critical} produto(s) em situação CRÍTICA — faça o pedido hoje!`]
                : []),
              ...(warning > 0
                ? [`${warning} produto(s) precisam de atenção nos próximos dias.`]
                : []),
              'Acesse /suppliers → Reposição para ver a timeline completa.',
            ],
          }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
        }
      },
    },

    STORE_COMPARE_SUPPLIERS: {
      description:
        'Compare suppliers for a specific product side by side (price, lead time, min order, last purchase). Use when user asks "compara fornecedores" or "qual melhor fornecedor para X".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          product_name: {
            type: 'string',
            description: 'Product name to compare suppliers for',
          },
        },
        required: ['product_name'],
      }),
      execute: async (params: { product_name: string }) => {
        try {
          const client = getClient()

          // Find product
          const { data: product } = await client
            .from('store_products')
            .select('id, name, price, cost_price')
            .eq('store_id', storeId)
            .ilike('name', `%${params.product_name}%`)
            .limit(1)
            .single()
          if (!product) return { error: `Produto "${params.product_name}" não encontrado.` }

          // Get all supplier links for this product
          const { data: links } = await client
            .from('store_product_suppliers')
            .select(
              '*, store_suppliers!inner(id, name, lead_time_days, min_order_value, contact_email, contact_phone)'
            )
            .eq('product_id', product.id)
            .eq('store_id', storeId)

          if (!links?.length) {
            return {
              produto: product.name,
              message: 'Nenhum fornecedor vinculado a este produto. Vincule fornecedores primeiro.',
            }
          }

          if (links.length === 1) {
            const sup = links[0].store_suppliers as unknown as { name: string }
            return {
              produto: product.name,
              message: `Apenas 1 fornecedor vinculado: "${sup.name}". Cadastre mais fornecedores para comparar.`,
            }
          }

          const comparacao = links.map((l) => {
            const sup = l.store_suppliers as unknown as {
              name: string
              lead_time_days: number
              min_order_value: number | null
              contact_email: string | null
              contact_phone: string | null
            }
            return {
              fornecedor: sup.name,
              custo: l.cost_price ? `R$ ${Number(l.cost_price).toFixed(2)}` : 'Não informado',
              lead_time: `${sup.lead_time_days} dias`,
              pedido_minimo: sup.min_order_value
                ? `R$ ${Number(sup.min_order_value).toFixed(2)}`
                : 'Sem mínimo',
              preferencial: l.is_preferred ? 'Sim' : 'Não',
              ultima_compra: l.last_order_at
                ? new Date(l.last_order_at).toLocaleDateString('pt-BR')
                : 'Sem registro',
              contato: sup.contact_email || sup.contact_phone || 'Não informado',
            }
          })

          // Identify best options
          const withCost = links.filter((l) => l.cost_price != null)
          const cheapest =
            withCost.length > 0
              ? withCost.reduce((a, b) => (Number(a.cost_price) < Number(b.cost_price) ? a : b))
              : null
          const fastest = links.reduce((a, b) => {
            const aLt = (a.store_suppliers as unknown as { lead_time_days: number }).lead_time_days
            const bLt = (b.store_suppliers as unknown as { lead_time_days: number }).lead_time_days
            return aLt < bLt ? a : b
          })

          return {
            produto: product.name,
            preco_venda: product.price ? `R$ ${Number(product.price).toFixed(2)}` : null,
            custo_registrado: product.cost_price
              ? `R$ ${Number(product.cost_price).toFixed(2)}`
              : null,
            comparacao,
            destaques: {
              menor_custo: cheapest
                ? (cheapest.store_suppliers as unknown as { name: string }).name
                : null,
              menor_lead_time: (fastest.store_suppliers as unknown as { name: string }).name,
            },
          }
        } catch (err) {
          return { error: `Falha: ${err instanceof Error ? err.message : String(err)}` }
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

/**
 * Sync products from Nuvemshop via native API into store_products.
 */
async function syncNuvemshopProducts(
  supabase: SupabaseClient,
  storeId: string
): Promise<{
  success?: boolean
  message?: string
  error?: string
  products?: Array<{ name: string; sku?: string; price: number; stock: number; published: boolean }>
  total?: number
}> {
  try {
    const { syncProducts, syncOrders } = await import('@/lib/nuvemshop/sync')
    const [productResult, orderResult] = await Promise.all([
      syncProducts(storeId),
      syncOrders(storeId),
    ])

    // Return product summary so the AI can present the results immediately
    const { data: syncedProducts } = await supabase
      .from('store_products')
      .select('name, sku, price, stock_quantity, is_published')
      .eq('store_id', storeId)
      .order('name')
      .limit(20)

    return {
      success: true,
      message: `Synced ${productResult.synced} products and ${orderResult.synced} orders from Nuvemshop.`,
      products: (syncedProducts ?? []).map((p) => ({
        name: p.name,
        sku: p.sku || undefined,
        price: Number(p.price ?? 0),
        stock: p.stock_quantity,
        published: p.is_published,
      })),
      total: productResult.synced + orderResult.synced,
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
