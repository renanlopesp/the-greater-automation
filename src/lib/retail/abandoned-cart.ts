import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging/telegram'
import { createLogger } from '@/lib/logger'

const log = createLogger('retail/abandoned-cart')

/**
 * Check for abandoned checkouts and send Telegram notifications.
 * Deduplicates against store_abandoned_cart_notifications.
 */
export async function checkAbandonedCarts(
  storeId: string,
  workflowRunId?: string
): Promise<{ notified: number }> {
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

  // Get Telegram chat link (optional — module runs without it, just can't notify)
  const { data: link } = await supabase
    .from('messaging_links')
    .select('external_chat_id')
    .eq('team_id', store.team_id)
    .eq('channel_type', 'telegram')
    .eq('is_verified', true)
    .maybeSingle()

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

  let notified = 0
  const newCarts: Array<{
    customer_name: string
    product: string
    value: number
    abandoned_ago: string
    status: 'enviado' | 'convertido' | 'aguardando'
  }> = []

  if (abandoned.length > 0) {
    // Get already-notified checkout IDs
    const checkoutIds = abandoned.map((c) => c.id)
    const { data: existing } = await supabase
      .from('store_abandoned_cart_notifications')
      .select('checkout_id')
      .eq('store_id', storeId)
      .in('checkout_id', checkoutIds)

    const notifiedSet = new Set((existing ?? []).map((e) => e.checkout_id))

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

      // Send Telegram notification (only if linked)
      let sent = false
      if (link?.external_chat_id) {
        const message = formatAbandonedCartNotification(checkout, store.name)
        try {
          await sendMessage(link.external_chat_id, message, 'Markdown')
          sent = true
          notified++
        } catch {
          // Best effort
        }
      }

      // Collect cart data for workflow_run_outputs
      const diffMs = Date.now() - new Date(checkout.created_at).getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      const abandonedAgo =
        diffHours > 0
          ? `${diffHours}h${diffMinutes > 0 ? ` ${diffMinutes}min` : ''}`
          : `${diffMinutes}min`

      const products = checkout.products as Array<{ name?: string }> | null
      const productName = products?.[0]?.name ?? 'Produto desconhecido'

      newCarts.push({
        customer_name: checkout.contact_name ?? 'Cliente anônimo',
        product: productName,
        value: checkout.total ? parseFloat(String(checkout.total)) : 0,
        abandoned_ago: abandonedAgo,
        status: sent ? 'enviado' : 'aguardando',
      })
    }
  } // end if (abandoned.length > 0)

  // Always write outputs so the activity feed shows the module is running
  if (workflowRunId) {
    await writeAbandonedCartOutputs(supabase, workflowRunId, store.team_id, newCarts, notified)
  }

  return { notified }
}

/**
 * Check if previously-notified abandoned carts have been recovered (completed).
 */
export async function checkRecoveredCarts(
  storeId: string,
  workflowRunId?: string
): Promise<{ recovered: number }> {
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
    .select('id, checkout_id, checkout_total, customer_name')
    .eq('store_id', storeId)
    .is('recovered_at', null)
    .limit(50)

  if (!pending || pending.length === 0) return { recovered: 0 }

  const { NuvemshopClient } = await import('@/lib/nuvemshop/client')
  const client = new NuvemshopClient(store.platform_store_id, store.platform_access_token)

  // Get Telegram chat link (optional)
  const { data: link } = await supabase
    .from('messaging_links')
    .select('external_chat_id')
    .eq('team_id', store.team_id)
    .eq('channel_type', 'telegram')
    .eq('is_verified', true)
    .maybeSingle()

  let recovered = 0
  const recoveredCarts: Array<{
    customer_name: string
    product: string
    value: number
    channel: string
  }> = []

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

        recoveredCarts.push({
          customer_name:
            (notification as { customer_name?: string }).customer_name ?? 'Cliente anônimo',
          product: 'Produto recuperado',
          value: notification.checkout_total ? Number(notification.checkout_total) : 0,
          channel: 'Telegram',
        })

        // Notify recovery
        if (link?.external_chat_id) {
          const total = notification.checkout_total
            ? `R$ ${Number(notification.checkout_total).toFixed(2)}`
            : 'valor desconhecido'
          await sendMessage(
            link.external_chat_id,
            `✅ *Carrinho Recuperado — ${store.name}*\n\n💰 *${total}* foi finalizado!\n\nO cliente completou a compra.`,
            'Markdown'
          )
        }
      }
    } catch {
      // Checkout may have been deleted — skip
    }
  }

  // Write workflow_run_outputs if we have a run ID and recoveries
  if (workflowRunId && recoveredCarts.length > 0) {
    await writeRecoveredCartOutputs(supabase, workflowRunId, store.team_id, recoveredCarts)
  }

  return { recovered }
}

// ---------------------------------------------------------------------------
// Helpers: write structured outputs to workflow_run_outputs
// ---------------------------------------------------------------------------

async function findAbandonedCartModuleId(
  supabase: ReturnType<typeof createServiceRoleClient>,
  teamId: string
): Promise<string | null> {
  try {
    // Find agent with agent_type='carrinho-conversao' for this team
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('team_id', teamId)
      .eq('agent_type' as never, 'carrinho-conversao')
      .maybeSingle()

    if (!agent) return null

    // Find the abandoned-cart module for that agent
    const { data: module } = await (
      supabase as unknown as ReturnType<typeof createServiceRoleClient>
    )
      .from('agent_modules' as never)
      .select('id')
      .eq('agent_id', agent.id)
      .eq('module_type', 'abandoned-cart')
      .maybeSingle()

    if (!module) return null
    return (module as { id: string }).id
  } catch {
    return null
  }
}

async function writeAbandonedCartOutputs(
  supabase: ReturnType<typeof createServiceRoleClient>,
  workflowRunId: string,
  teamId: string,
  carts: Array<{
    customer_name: string
    product: string
    value: number
    abandoned_ago: string
    status: 'enviado' | 'convertido' | 'aguardando'
  }>,
  notified: number
): Promise<void> {
  try {
    const moduleId = await findAbandonedCartModuleId(supabase, teamId)
    // If no module found, agent not installed — skip output writing
    if (!moduleId) return

    const totalValue = carts.reduce((sum, c) => sum + c.value, 0)

    // Write cart-table output
    // workflow_run_id is nullable — we use null here since agent_workflow_runs
    // is a different table from the workflow_runs that workflow_run_outputs references.
    await (
      supabase as never as { from: (t: string) => { insert: (d: unknown) => Promise<unknown> } }
    )
      .from('workflow_run_outputs')
      .insert({
        workflow_run_id: null,
        module_id: moduleId,
        output_type: 'cart-table',
        output_data: {
          carts,
          total_detected: carts.length,
          total_recovered: 0,
          total_value_at_risk: totalValue,
        },
        summary_text: `${carts.length} carrinho${carts.length !== 1 ? 's' : ''} detectado${carts.length !== 1 ? 's' : ''}, ${notified} notificado${notified !== 1 ? 's' : ''}`,
      })

    // Write kpi-summary output
    await (
      supabase as never as { from: (t: string) => { insert: (d: unknown) => Promise<unknown> } }
    )
      .from('workflow_run_outputs')
      .insert({
        workflow_run_id: null,
        module_id: moduleId,
        output_type: 'kpi-summary',
        output_data: {
          kpis: [
            { label: 'carrinhos hoje', value: String(carts.length) },
            { label: 'notificados', value: String(notified) },
            { label: 'valor em risco', value: `R$${totalValue.toFixed(0)}` },
          ],
          summary: `Detectei ${carts.length} carrinho${carts.length !== 1 ? 's' : ''} abandonado${carts.length !== 1 ? 's' : ''} e notifiquei ${notified} cliente${notified !== 1 ? 's' : ''}.`,
        },
        summary_text: `KPIs do ciclo de abandono`,
      })
  } catch (err) {
    // Non-fatal: output writing should not break the cart check
    log.warn({ err }, 'Failed to write cart-table workflow_run_outputs')
  }
}

async function writeRecoveredCartOutputs(
  supabase: ReturnType<typeof createServiceRoleClient>,
  workflowRunId: string,
  teamId: string,
  conversions: Array<{
    customer_name: string
    product: string
    value: number
    channel: string
  }>
): Promise<void> {
  try {
    const moduleId = await findAbandonedCartModuleId(supabase, teamId)
    if (!moduleId) return

    const totalRecovered = conversions.reduce((sum, c) => sum + c.value, 0)

    await (
      supabase as never as { from: (t: string) => { insert: (d: unknown) => Promise<unknown> } }
    )
      .from('workflow_run_outputs')
      .insert({
        workflow_run_id: null,
        module_id: moduleId,
        output_type: 'conversion-list',
        output_data: {
          conversions,
          total_recovered_value: totalRecovered,
          insight: `${conversions.length} carrinho${conversions.length !== 1 ? 's' : ''} recuperado${conversions.length !== 1 ? 's' : ''} com valor total de R$${totalRecovered.toFixed(2)}.`,
        },
        summary_text: `${conversions.length} carrinho${conversions.length !== 1 ? 's' : ''} recuperado${conversions.length !== 1 ? 's' : ''}`,
      })
  } catch (err) {
    log.warn({ err }, 'Failed to write conversion-list workflow_run_outputs')
  }
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
