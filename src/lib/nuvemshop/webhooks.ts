import { syncSingleProduct } from './sync'
import { NuvemshopClient } from './client'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendOrderNotification } from '@/lib/retail/order-notifications'
import { createLogger } from '@/lib/logger'

const log = createLogger('nuvemshop/webhooks')

interface StoreContext {
  id: string
  platform_store_id: string | null
  platform_access_token: string | null
  team_id: string
}

export async function handleWebhookEvent(
  store: StoreContext,
  event: string,
  resourceId: string
): Promise<void> {
  switch (event) {
    case 'product/updated':
    case 'product/created':
      await handleProductUpdate(store, resourceId)
      break
    case 'order/created':
    case 'order/paid':
      await handleOrderEvent(store, event, resourceId)
      break
    default:
      console.log(`[nuvemshop/webhooks] Unhandled event: ${event}`)
  }
}

async function handleProductUpdate(store: StoreContext, productId: string): Promise<void> {
  await syncSingleProduct(store.id, productId)
}

async function handleOrderEvent(
  store: StoreContext,
  event: string,
  orderId: string
): Promise<void> {
  if (!store.platform_access_token || !store.platform_store_id) return

  const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)
  const supabase = createServiceRoleClient()

  try {
    // getOrder takes a number
    const order = await client.getOrder(parseInt(orderId, 10))

    const orderData = {
      store_id: store.id,
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

    await supabase.from('store_orders').upsert(orderData, { onConflict: 'store_id,external_id' })

    // Send Telegram notification for new orders
    if (event === 'order/created') {
      await sendOrderNotification(store.id, {
        order_number: String(order.number),
        customer_name: order.customer?.name ?? 'Anônimo',
        total: parseFloat(order.total ?? '0'),
        currency: order.currency ?? 'BRL',
        items: (order.products ?? []).map((p) => ({
          name: p.name ?? 'Produto',
          quantity: parseInt(String(p.quantity ?? '1'), 10),
          price: parseFloat(p.price ?? '0'),
        })),
        status: order.status ?? 'open',
      })
    }

    // For order/paid, re-sync affected products (stock may have changed)
    if (event === 'order/paid' && order.products) {
      for (const product of order.products) {
        if (product.product_id) {
          await syncSingleProduct(store.id, String(product.product_id))
        }
      }
    }
  } catch (err) {
    log.error({ err, event, orderId }, 'Error handling webhook event')
  }
}
