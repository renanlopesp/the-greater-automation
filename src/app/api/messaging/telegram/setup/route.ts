import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { setWebhook, deleteWebhook, getMe } from '@/lib/messaging/telegram'

/**
 * POST: Register the Telegram webhook.
 * Body: { url: string } — the public base URL (e.g. ngrok URL or production domain).
 *
 * Only accessible by authenticated users (admin check can be added later).
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const baseUrl = (body.url as string)?.replace(/\/+$/, '')
  if (!baseUrl) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const webhookUrl = `${baseUrl}/api/messaging/telegram/webhook`
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || ''

  const result = await setWebhook(webhookUrl, secret)
  const botInfo = await getMe()

  return NextResponse.json({
    success: true,
    webhookUrl,
    bot: botInfo,
    telegramResponse: result,
  })
}

/**
 * DELETE: Remove the Telegram webhook.
 */
export async function DELETE() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await deleteWebhook()
  return NextResponse.json({ success: true, telegramResponse: result })
}

/**
 * GET: Check current webhook status and bot info.
 */
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 })
  }

  const [botInfo, webhookInfo] = await Promise.all([
    getMe(),
    fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json()),
  ])

  return NextResponse.json({
    bot: botInfo,
    webhook: webhookInfo.result,
  })
}
