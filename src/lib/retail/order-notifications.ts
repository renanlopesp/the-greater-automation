import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging/telegram'

export interface OrderData {
  order_number: string
  customer_name: string
  total: number
  currency: string
  items: Array<{ name: string; quantity: number; price: number }>
  status: string
}

/**
 * Format order notification message in PT-BR.
 */
export function formatOrderNotification(storeName: string, order: OrderData): string {
  const lines: string[] = [
    `🛍️ *Novo Pedido — ${storeName}*`,
    '',
    `📋 Pedido *#${order.order_number}*`,
    `👤 ${order.customer_name}`,
    `💰 *R$ ${order.total.toFixed(2)}*`,
    '',
  ]

  if (order.items.length > 0) {
    lines.push('*Itens:*')
    for (const item of order.items.slice(0, 5)) {
      lines.push(
        `• ${item.name} × ${item.quantity} — R$ ${(item.price * item.quantity).toFixed(2)}`
      )
    }
    if (order.items.length > 5) {
      lines.push(`...e mais ${order.items.length - 5} itens`)
    }
  }

  return lines.join('\n')
}

/**
 * Send order notification to the store's linked Telegram chat.
 * Respects the `settings.order_notifications_enabled` flag (default: true).
 */
export async function sendOrderNotification(storeId: string, order: OrderData): Promise<void> {
  const supabase = createServiceRoleClient()

  const { data: store } = await supabase
    .from('stores')
    .select('name, team_id, settings')
    .eq('id', storeId)
    .single()

  if (!store) return

  // Check if order notifications are enabled (default: true)
  const settings = store.settings as Record<string, unknown> | null
  if (settings?.order_notifications_enabled === false) return

  const { data: link } = await supabase
    .from('messaging_links')
    .select('external_chat_id')
    .eq('team_id', store.team_id)
    .eq('channel_type', 'telegram')
    .eq('is_verified', true)
    .single()

  if (!link?.external_chat_id) return

  const message = formatOrderNotification(store.name, order)
  await sendMessage(link.external_chat_id, message, 'Markdown')
}
