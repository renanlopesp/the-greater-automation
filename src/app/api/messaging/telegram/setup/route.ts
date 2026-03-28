import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { setWebhook, deleteWebhook, getMe } from '@/lib/messaging/telegram'

const TelegramSetupSchema = z.object({
  url: z
    .string()
    .url()
    .refine((val) => val.startsWith('https://'), { message: 'URL must use HTTPS' }),
})

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

  const rawBody = await request.json().catch(() => null)
  if (!rawBody) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = TelegramSetupSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: Object.keys(parsed.error.flatten().fieldErrors) },
      { status: 400 }
    )
  }
  const baseUrl = parsed.data.url.replace(/\/+$/, '')

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
