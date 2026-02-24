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
            id: p.id,
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
        'Search or list store customers. Use when user asks about customers, buyers, or "quem comprou?", "quantos clientes tenho?".',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search by name, email, or identification' },
          email: { type: 'string', description: 'Search by exact email' },
          limit: { type: 'number', description: 'Max results (default: 20)' },
        },
      }),
      execute: async (params: { search?: string; email?: string; limit?: number }) => {
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
          const customers = await client.getCustomers({
            q: params.search,
            email: params.email,
            per_page: params.limit ?? 20,
          })
          return {
            customers: customers.map((c) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              phone: c.phone,
              orders_count: c.orders_count,
              total_spent: c.total_spent,
            })),
            total: customers.length,
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
    const { syncProducts } = await import('@/lib/nuvemshop/sync')
    const result = await syncProducts(storeId)

    // Return product summary so the AI can present the results immediately
    const { data: syncedProducts } = await supabase
      .from('store_products')
      .select('name, sku, price, stock_quantity, is_published')
      .eq('store_id', storeId)
      .order('name')
      .limit(20)

    return {
      success: true,
      message: `Synced ${result.synced} products from Nuvemshop (${result.created} new, ${result.updated} updated).`,
      products: (syncedProducts ?? []).map((p) => ({
        name: p.name,
        sku: p.sku || undefined,
        price: Number(p.price ?? 0),
        stock: p.stock_quantity,
        published: p.is_published,
      })),
      total: result.synced,
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
