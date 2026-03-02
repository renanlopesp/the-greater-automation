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
        'Get sales summary for a date range. Shows order count, revenue, and top products. Queries the store API directly for fresh data. Use this when the user asks about sales, revenue, or "quanto vendi?".',
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
            })
            // Filter by end date client-side (API only supports created_at_min)
            for (const o of orders) {
              if (new Date(o.created_at) <= endDate) {
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
            params.period ?? 'today'
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
                value: c.value,
                valid: c.valid,
                used: c.used,
                max_uses: c.max_uses,
                start_date: c.start_date,
                end_date: c.end_date,
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
              message: `Coupon "${coupon.code}" created (${coupon.type}: ${coupon.value}).`,
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

        for (const entry of params.entries) {
          if (entry.cost_price < 0) continue

          let product = entry.sku
            ? allProducts.find((p) => p.sku?.toLowerCase() === entry.sku!.toLowerCase())
            : null

          if (!product && entry.name) {
            // Exact match first
            product = allProducts.find((p) => p.name.toLowerCase() === entry.name!.toLowerCase())
            // Fuzzy match fallback
            if (!product) {
              const needle = normalizeAccents(entry.name)
              product = allProducts.find((p) => normalizeAccents(p.name).includes(needle))
            }
          }

          if (product && !matched.some((m) => m.id === product!.id)) {
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

        // Bulk update
        let updated = 0
        let errors = 0
        for (const m of matched) {
          const { error } = await supabase
            .from('store_products')
            .update({ cost_price: m.cost_price })
            .eq('id', m.id)
          if (error) errors++
          else updated++
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
