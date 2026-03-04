import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendToAllChannels } from '@/lib/messaging/channel'

/**
 * Check for abandoned checkouts and send Telegram notifications.
 * Deduplicates against store_abandoned_cart_notifications.
 */
export async function checkAbandonedCarts(storeId: string): Promise<{ notified: number }> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('name, team_id, platform, platform_store_id, platform_access_token, settings')
    .eq('id', storeId)
    .single()

  if (!store) return { notified: 0 }

  // Check if notifications are enabled (default: true)
  const settings = store.settings as Record<string, unknown> | null
  if (settings?.abandoned_cart_notifications_enabled === false) return { notified: 0 }

  if (store.platform !== 'nuvemshop' || !store.platform_store_id || !store.platform_access_token) {
    return { notified: 0 }
  }

  // Fetch abandoned checkouts from Nuvemshop
  const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
  const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

  let checkouts
  try {
    checkouts = await client.getAbandonedCheckouts({ per_page: 50 })
  } catch {
    return { notified: 0 }
  }

  // Delay threshold (default 60 minutes)
  const delayMinutes = (settings?.abandoned_cart_delay_minutes as number) ?? 60
  const delayThreshold = new Date(Date.now() - delayMinutes * 60 * 1000)

  // Filter: not completed and older than delay
  const abandoned = checkouts.filter((c) => {
    if (c.completed_at) return false
    const createdAt = new Date(c.created_at)
    return createdAt < delayThreshold
  })

  if (abandoned.length === 0) return { notified: 0 }

  // Get already-notified checkout IDs
  const checkoutIds = abandoned.map((c) => c.id)
  const { data: existing } = await supabase
    .from('store_abandoned_cart_notifications')
    .select('checkout_id')
    .eq('store_id', storeId)
    .in('checkout_id', checkoutIds)

  const notifiedSet = new Set((existing ?? []).map((e) => e.checkout_id))

  let notified = 0
  for (const checkout of abandoned) {
    if (notifiedSet.has(checkout.id)) continue

    // Insert tracking record
    const { error } = await supabase.from('store_abandoned_cart_notifications').insert({
      store_id: storeId,
      checkout_id: checkout.id,
      checkout_total: checkout.total ? parseFloat(String(checkout.total)) : null,
      customer_name: checkout.contact_name ?? null,
      customer_email: checkout.contact_email ?? null,
    })

    if (error) continue

    // Send notification
    const message = formatAbandonedCartNotification(checkout, store.name)
    try {
      await sendToAllChannels(store.team_id, message, 'Markdown')
      notified++
    } catch {
      // Best effort
    }
  }

  return { notified }
}

/**
 * Check if previously-notified abandoned carts have been recovered (completed).
 */
export async function checkRecoveredCarts(storeId: string): Promise<{ recovered: number }> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('name, team_id, platform, platform_store_id, platform_access_token')
    .eq('id', storeId)
    .single()

  if (
    !store ||
    store.platform !== 'nuvemshop' ||
    !store.platform_store_id ||
    !store.platform_access_token
  ) {
    return { recovered: 0 }
  }

  // Get pending (not yet recovered) notifications
  const { data: pending } = await supabase
    .from('store_abandoned_cart_notifications')
    .select('id, checkout_id, checkout_total')
    .eq('store_id', storeId)
    .is('recovered_at', null)
    .limit(50)

  if (!pending || pending.length === 0) return { recovered: 0 }

  const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
  const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

  let recovered = 0
  for (const notification of pending) {
    try {
      const checkout = await client.getAbandonedCheckout(notification.checkout_id)
      if (checkout.completed_at) {
        // Mark as recovered
        await supabase
          .from('store_abandoned_cart_notifications')
          .update({ recovered_at: new Date().toISOString() })
          .eq('id', notification.id)

        recovered++

        // Notify recovery
        const total = notification.checkout_total
          ? `R$ ${Number(notification.checkout_total).toFixed(2)}`
          : 'valor desconhecido'
        await sendToAllChannels(
          store.team_id,
          `✅ *Carrinho Recuperado — ${store.name}*\n\n💰 *${total}* foi finalizado!\n\nO cliente completou a compra.`,
          'Markdown'
        )
      }
    } catch {
      // Checkout may have been deleted — skip
    }
  }

  return { recovered }
}

function formatAbandonedCartNotification(
  checkout: {
    contact_name?: string | null
    contact_email?: string | null
    total?: string | number | null
    products?: Array<unknown> | null
    created_at: string
    abandoned_checkout_url?: string | null
  },
  storeName: string
): string {
  const customerName = checkout.contact_name || 'Cliente anônimo'
  const email = checkout.contact_email ? ` (${checkout.contact_email})` : ''
  const total = checkout.total ? `R$ ${Number(checkout.total).toFixed(2)}` : 'Valor desconhecido'
  const itemCount = checkout.products?.length ?? 0
  const itemText = itemCount === 1 ? '1 item' : `${itemCount} itens`

  // Time since abandonment
  const createdAt = new Date(checkout.created_at)
  const diffMs = Date.now() - createdAt.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  const timeAgo =
    diffHours > 0
      ? `${diffHours}h${diffMinutes > 0 ? ` ${diffMinutes}min` : ''}`
      : `${diffMinutes}min`

  const lines: string[] = [
    `🛒 *Carrinho Abandonado — ${storeName}*`,
    '',
    `👤 ${customerName}${email}`,
    `💰 *${total}* (${itemText})`,
    `⏰ Abandonado há ${timeAgo}`,
  ]

  if (checkout.abandoned_checkout_url) {
    lines.push('', `🔗 [Link de recuperação](${checkout.abandoned_checkout_url})`)
  }

  return lines.join('\n')
}
