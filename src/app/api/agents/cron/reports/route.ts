import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging/telegram'
import {
  generateStockReport,
  generatePriceReport,
  generateSalesReport,
} from '@/lib/retail/agent-reports'

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

  let sent = 0
  const errors: string[] = []

  for (const agent of agents) {
    const settings = agent.notification_settings as Record<string, unknown>

    if (!settings.telegram_enabled) continue
    if ((settings.report_hour as number) !== brtHour) continue

    try {
      // Get the team's store
      const { data: store } = await supabase
        .from('stores')
        .select('id, team_id')
        .eq('team_id', agent.team_id)
        .single()

      if (!store) continue

      // Get verified Telegram link for this team
      const { data: link } = await supabase
        .from('messaging_links')
        .select('external_chat_id')
        .eq('team_id', agent.team_id)
        .eq('channel_type', 'telegram')
        .eq('is_verified', true)
        .single()

      if (!link?.external_chat_id) continue

      // Generate report based on agent name pattern
      const report = await generateAgentReport(agent.name, store.id)

      if (report) {
        await sendMessage(link.external_chat_id, report, 'Markdown')
        sent++
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[agent-reports] Error for agent ${agent.name}:`, msg)
      errors.push(`${agent.name}: ${msg}`)
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
