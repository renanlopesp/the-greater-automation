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
 * Format order notification message.
 */
export function formatOrderNotification(storeName: string, order: OrderData): string {
  const lines: string[] = [
    `🛍️ *New Order — ${storeName}*`,
    '',
    `📋 Order *#${order.order_number}*`,
    `👤 ${order.customer_name}`,
    `💰 *${formatCurrency(order.total, order.currency)}*`,
    '',
  ]

  if (order.items.length > 0) {
    lines.push('*Items:*')
    for (const item of order.items.slice(0, 5)) {
      lines.push(
        `• ${item.name} × ${item.quantity} — ${formatCurrency(item.price * item.quantity, order.currency)}`
      )
    }
    if (order.items.length > 5) {
      lines.push(`...and ${order.items.length - 5} more items`)
    }
  }

  return lines.join('\n')
}

function formatCurrency(value: number, currency: string): string {
  if (currency === 'BRL') return `R$ ${value.toFixed(2)}`
  if (currency === 'USD') return `$ ${value.toFixed(2)}`
  return `${currency} ${value.toFixed(2)}`
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
