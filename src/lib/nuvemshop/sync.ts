import { NuvemshopClient, NuvemshopApiError } from './client'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { checkStockAlerts, checkProductStockAlert } from '@/lib/retail/stock-alerts'
import { createLogger } from '@/lib/logger'

const log = createLogger('nuvemshop/sync')

export interface SyncResult {
  synced: number
  created: number
  updated: number
  errors: number
}

export async function syncProducts(storeId: string): Promise<SyncResult> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, platform_store_id, platform_access_token')
    .eq('id', storeId)
    .single()

  if (!store?.platform_access_token || !store?.platform_store_id) {
    throw new Error('Store not connected to Nuvemshop')
  }

  const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

  let products: Awaited<ReturnType<typeof client.getAllProducts>>
  try {
    products = await client.getAllProducts()
  } catch (error) {
    if (error instanceof NuvemshopApiError && error.isUnauthorized) {
      // Mark store as disconnected
      await supabase.from('stores').update({ platform_access_token: null }).eq('id', storeId)

      // Alert user via Telegram if linked
      const { data: storeForAlert } = await supabase
        .from('stores')
        .select('team_id')
        .eq('id', storeId)
        .single()
      if (storeForAlert) {
        const { data: link } = await supabase
          .from('messaging_links')
          .select('external_chat_id')
          .eq('team_id', storeForAlert.team_id)
          .eq('channel_type', 'telegram')
          .eq('is_verified', true)
          .single()
        if (link?.external_chat_id) {
          const { sendMessage } = await import('@/lib/messaging/telegram')
          await sendMessage(
            link.external_chat_id,
            '⚠️ Sua conexão com a Nuvemshop foi desconectada. O token de acesso expirou ou foi revogado. Reconecte em /workspace.'
          )
        }
      }
      throw new Error('Nuvemshop token revoked — store marked as disconnected')
    }
    throw error
  }

  let created = 0
  let updated = 0
  let errors = 0

  for (const product of products) {
    try {
      const totalStock = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
      const price = product.variants[0]?.price ? parseFloat(product.variants[0].price) : null
      // Check existing before upsert to count creates vs updates
      const { count: existingCount } = await supabase
        .from('store_products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('external_id', String(product.id))

      const productData = {
        store_id: storeId,
        external_id: String(product.id),
        name: product.name?.pt ?? product.name?.es ?? product.name?.en ?? 'Sem nome',
        sku: product.variants[0]?.sku ?? null,
        price,
        stock_quantity: totalStock,
        variants: product.variants.map((v) => ({
          id: String(v.id),
          name: v.values?.map((val) => val.pt ?? val.es ?? val.en ?? '').join(' / ') ?? '',
          sku: v.sku,
          price: v.price ? parseFloat(v.price) : null,
          stock: v.stock ?? 0,
        })),
        images: product.images?.map((img) => img.src) ?? [],
        is_published: product.published ?? true,
        last_synced_at: new Date().toISOString(),
      }

      // Use manual INSERT/UPDATE to preserve cost_price (not overwritten by sync)
      let error: { message: string } | null = null
      if ((existingCount ?? 0) > 0) {
        // UPDATE: exclude cost_price from the update set
        const { error: updateErr } = await supabase
          .from('store_products')
          .update({
            name: productData.name,
            sku: productData.sku,
            price: productData.price,
            stock_quantity: productData.stock_quantity,
            variants: productData.variants,
            images: productData.images,
            is_published: productData.is_published,
            last_synced_at: productData.last_synced_at,
          })
          .eq('store_id', storeId)
          .eq('external_id', String(product.id))
        error = updateErr
      } else {
        // INSERT: cost_price defaults to null
        const { error: insertErr } = await supabase.from('store_products').insert(productData)
        error = insertErr
      }

      if (error) {
        log.error({ err: error.message, productId: product.id }, 'Error upserting product')
        errors++
      } else if ((existingCount ?? 0) > 0) {
        updated++
      } else {
        created++
      }
    } catch (err) {
      log.error({ err, productId: product.id }, 'Error processing product')
      errors++
    }
  }

  // Update last_sync_at on store (column is last_sync_at per DB schema)
  await supabase.from('stores').update({ last_sync_at: new Date().toISOString() }).eq('id', storeId)

  // Check stock alerts after full sync
  await checkStockAlerts(storeId)

  return { synced: products.length, created, updated, errors }
}

export async function syncOrders(storeId: string, since?: string): Promise<SyncResult> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, platform_store_id, platform_access_token')
    .eq('id', storeId)
    .single()

  if (!store?.platform_access_token || !store?.platform_store_id) {
    throw new Error('Store not connected to Nuvemshop')
  }

  const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

  let created = 0
  let updated = 0
  let errors = 0
  let totalFetched = 0
  let page = 1

  while (true) {
    const orders = await client.getOrders(page, 50, since ? { created_at_min: since } : undefined)
    totalFetched += orders.length

    for (const order of orders) {
      try {
        const { count: existingCount } = await supabase
          .from('store_orders')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', storeId)
          .eq('external_id', String(order.id))

        const orderData = {
          store_id: storeId,
          external_id: String(order.id),
          order_number: order.number ?? String(order.id),
          customer_name: order.customer?.name ?? 'Anônimo',
          customer_email: order.customer?.email ?? null,
          total: parseFloat(order.total ?? '0'),
          currency: order.currency ?? 'BRL',
          status: order.status ?? 'open',
          payment_status: order.payment_status ?? 'pending',
          items: (order.products ?? []).map((p) => ({
            name: p.name ?? 'Produto',
            quantity: parseInt(String(p.quantity ?? '1'), 10),
            price: parseFloat(p.price ?? '0'),
          })),
          ordered_at: order.created_at ?? new Date().toISOString(),
        }

        const { error } = await supabase
          .from('store_orders')
          .upsert(orderData, { onConflict: 'store_id,external_id' })

        if (error) {
          log.error({ err: error.message, orderId: order.id }, 'Error upserting order')
          errors++
        } else if ((existingCount ?? 0) > 0) {
          updated++
        } else {
          created++
        }
      } catch (err) {
        log.error({ err, orderId: order.id }, 'Error processing order')
        errors++
      }
    }

    if (orders.length < 50) break
    page++
  }

  return { synced: totalFetched, created, updated, errors }
}

export async function syncSingleProduct(storeId: string, externalProductId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, platform_store_id, platform_access_token')
    .eq('id', storeId)
    .single()

  if (!store?.platform_access_token || !store?.platform_store_id) return

  const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

  try {
    // getProduct takes a number
    const product = await client.getProduct(parseInt(externalProductId, 10))
    const totalStock = product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)

    // Check if product exists to decide insert vs update (preserve cost_price)
    const { count: existsCount } = await supabase
      .from('store_products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('external_id', String(product.id))

    const syncData = {
      name: product.name?.pt ?? product.name?.es ?? product.name?.en ?? 'Sem nome',
      sku: product.variants[0]?.sku ?? null,
      price: product.variants[0]?.price ? parseFloat(product.variants[0].price) : null,
      stock_quantity: totalStock,
      variants: product.variants.map((v) => ({
        id: String(v.id),
        name: v.values?.map((val) => val.pt ?? val.es ?? val.en ?? '').join(' / ') ?? '',
        sku: v.sku,
        price: v.price ? parseFloat(v.price) : null,
        stock: v.stock ?? 0,
      })),
      images: product.images?.map((img) => img.src) ?? [],
      is_published: product.published ?? true,
      last_synced_at: new Date().toISOString(),
    }

    if ((existsCount ?? 0) > 0) {
      // UPDATE: preserve cost_price
      await supabase
        .from('store_products')
        .update(syncData)
        .eq('store_id', storeId)
        .eq('external_id', String(product.id))
    } else {
      await supabase.from('store_products').insert({
        store_id: storeId,
        external_id: String(product.id),
        ...syncData,
      })
    }

    // Check stock alert for this specific product
    const { data: dbProduct } = await supabase
      .from('store_products')
      .select('id')
      .eq('store_id', storeId)
      .eq('external_id', String(product.id))
      .single()
    if (dbProduct) {
      await checkProductStockAlert(storeId, dbProduct.id as string)
    }
  } catch (err) {
    log.error({ err, externalProductId }, 'Error syncing product')
  }
}
