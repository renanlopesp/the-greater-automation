import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging/telegram'
import {
  generateStockReport,
  generatePriceReport,
  generateSalesReport,
} from '@/lib/retail/agent-reports'

// Allow up to 60s for multiple DB queries + Telegram sends per agent.
export const maxDuration = 60

/**
 * Hourly cron endpoint for per-agent Telegram reports.
 * Called by pg_cron every hour. Checks each agent's notification_settings
 * to see if it should send a report at the current BRT hour.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Get current hour in BRT (UTC-3)
  const now = new Date()
  const brtHour = (now.getUTCHours() - 3 + 24) % 24

  // Find agents with telegram_enabled=true and report_hour matching current BRT hour
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, team_id, notification_settings')
    .neq('notification_settings', '{}')

  if (!agents || agents.length === 0) {
    return NextResponse.json({ sent: 0, hour: brtHour })
  }

  // Filter agents that should fire this hour
  const activeAgents = agents.filter((agent) => {
    const settings = agent.notification_settings as Record<string, unknown>
    return settings.telegram_enabled && (settings.report_hour as number) === brtHour
  })

  if (activeAgents.length === 0) {
    return NextResponse.json({ sent: 0, checked: agents.length, hour: brtHour })
  }

  // Batch-fetch all stores and messaging_links for active agents' teams
  const teamIds = [...new Set(activeAgents.map((a) => a.team_id).filter(Boolean))] as string[]

  const [{ data: stores }, { data: messagingLinks }] = await Promise.all([
    supabase.from('stores').select('id, team_id').in('team_id', teamIds),
    supabase
      .from('messaging_links')
      .select('team_id, external_chat_id')
      .in('team_id', teamIds)
      .eq('channel_type', 'telegram')
      .eq('is_verified', true),
  ])

  // Build Maps for O(1) lookup
  const storeByTeam = new Map<string, string>() // team_id -> store_id
  for (const store of stores ?? []) {
    if (!storeByTeam.has(store.team_id)) storeByTeam.set(store.team_id, store.id)
  }

  const chatIdByTeam = new Map<string, string>() // team_id -> external_chat_id
  for (const link of messagingLinks ?? []) {
    if (link.external_chat_id) chatIdByTeam.set(link.team_id, link.external_chat_id)
  }

  // Process all active agents in parallel
  let sent = 0
  const errors: string[] = []

  const results = await Promise.allSettled(
    activeAgents.map(async (agent) => {
      const storeId = storeByTeam.get(agent.team_id)
      if (!storeId) return

      const chatId = chatIdByTeam.get(agent.team_id)
      if (!chatId) return

      const report = await generateAgentReport(agent.name, storeId)
      if (report) {
        await sendMessage(chatId, report, 'Markdown')
        return true
      }
    })
  )

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled' && result.value === true) {
      sent++
    } else if (result.status === 'rejected') {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.error(`[agent-reports] Error for agent ${activeAgents[i].name}:`, msg)
      errors.push(`${activeAgents[i].name}: ${msg}`)
    }
  }

  return NextResponse.json({
    sent,
    checked: agents.length,
    hour: brtHour,
    ...(errors.length > 0 && { errors }),
  })
}

/**
 * Dispatch report generation based on agent name.
 */
async function generateAgentReport(agentName: string, storeId: string): Promise<string | null> {
  const name = agentName.toLowerCase()

  if (name.includes('stock') || name.includes('estoquista') || name.includes('inventory')) {
    return generateStockReport(storeId)
  }

  if (name.includes('price') || name.includes('vigia') || name.includes('monitor')) {
    return generatePriceReport(storeId)
  }

  if (name.includes('sales') || name.includes('caixa') || name.includes('analyst')) {
    return generateSalesReport(storeId)
  }

  return null
}
