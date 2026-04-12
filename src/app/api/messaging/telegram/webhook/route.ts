import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage, sendChatAction, type TelegramUpdate } from '@/lib/messaging/telegram'
import { processMessage } from '@/lib/messaging/telegram-processor'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/messaging/telegram/webhook')

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

// Allow up to 120s for AI + tool execution
export const maxDuration = 120

/**
 * Telegram Bot webhook handler.
 * Handles /start and /link commands inline (fast, no AI).
 * All other messages are processed inline via Managed Agent.
 */
export async function POST(request: NextRequest) {
  // 1. Verify webhook secret — fail closed when not configured
  if (!WEBHOOK_SECRET) {
    log.error('TELEGRAM_WEBHOOK_SECRET is not set — rejecting all requests')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const secretHeader = request.headers.get('x-telegram-bot-api-secret-token')
  if (!secretHeader || !timingSafeEqual(Buffer.from(secretHeader), Buffer.from(WEBHOOK_SECRET))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let update: TelegramUpdate
  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only handle text messages
  if (!update.message?.text || !update.message.from) {
    return NextResponse.json({ ok: true })
  }

  const chatId = String(update.message.chat.id)
  const text = update.message.text.trim()
  const username = update.message.from.username ?? update.message.from.first_name

  const supabase = createServiceRoleClient()

  // 2. Handle /start command
  if (text === '/start') {
    await sendMessage(
      chatId,
      [
        'Welcome to Snew! I am your AI automation assistant.',
        '',
        'To get started, link your account:',
        '1. Go to your dashboard → Messaging',
        '2. Click "Generate Code"',
        '3. Send me: /link YOUR_CODE',
        '',
        'Once linked, you can manage your entire workspace from here — agents, workflows, skills, and integrations.',
      ].join('\n')
    )
    return NextResponse.json({ ok: true })
  }

  // 3. Handle /link CODE command
  if (text.startsWith('/link ')) {
    const code = text.slice(6).trim()
    if (!code || code.length !== 6) {
      await sendMessage(chatId, 'Please provide a valid 6-digit code: /link 123456')
      return NextResponse.json({ ok: true })
    }

    // Find pending link with this code
    const { data: link } = await supabase
      .from('messaging_links')
      .select('id, verification_expires_at')
      .eq('verification_code', code)
      .eq('is_verified', false)
      .single()

    if (!link) {
      await sendMessage(
        chatId,
        'Invalid or expired code. Please generate a new one from your dashboard.'
      )
      return NextResponse.json({ ok: true })
    }

    // Check expiry
    if (link.verification_expires_at && new Date(link.verification_expires_at) < new Date()) {
      await sendMessage(
        chatId,
        'This code has expired. Please generate a new one from your dashboard.'
      )
      return NextResponse.json({ ok: true })
    }

    // Activate the link
    const { data: updatedLink } = await supabase
      .from('messaging_links')
      .update({
        external_chat_id: chatId,
        external_username: username,
        is_verified: true,
        verification_code: null,
        verification_expires_at: null,
      })
      .eq('id', link.id)
      .select('team_id')
      .single()

    // Check if team has a store for personalized welcome
    let welcomeMessage =
      'Account linked successfully! You now have full access to your workspace. Try asking me to list your agents or workflows.'

    if (updatedLink?.team_id) {
      const { data: store } = await supabase
        .from('stores')
        .select('name, segment')
        .eq('team_id', updatedLink.team_id)
        .single()

      if (store) {
        welcomeMessage = [
          `Conta vinculada! Sou o Snew, seu assistente para a **${store.name}**.`,
          '',
          'Posso te ajudar com:',
          '- "Como tá meu estoque?" — consultar produtos',
          '- "Quanto vendi hoje?" — resumo de vendas',
          '- "Pedidos recentes" — listar pedidos',
          '',
          'Experimente agora!',
        ].join('\n')
      }
    }

    await sendMessage(chatId, welcomeMessage)
    return NextResponse.json({ ok: true })
  }

  // 4. Look up verified link for this chat
  const { data: link } = await supabase
    .from('messaging_links')
    .select('id, user_id, team_id, conversation_id')
    .eq('channel_type', 'telegram')
    .eq('external_chat_id', chatId)
    .eq('is_verified', true)
    .single()

  if (!link) {
    await sendMessage(
      chatId,
      'Your Telegram is not linked to an account. Use /start to see how to link it.'
    )
    return NextResponse.json({ ok: true })
  }

  // 5. Send typing indicator (fire-and-forget)
  sendChatAction(chatId).catch(() => {})

  // 6. Insert into queue for tracking
  const { data: queueMsg } = await supabase
    .from('telegram_message_queue')
    .insert({
      chat_id: chatId,
      message_text: text,
      username,
      link_id: link.id,
      status: 'processing',
      attempts: 1,
    })
    .select('id')
    .single()

  // 7. Process message inline via Managed Agent
  try {
    await processMessage(supabase, link, chatId, text, username)

    if (queueMsg) {
      await supabase
        .from('telegram_message_queue')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', queueMsg.id)
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    log.error({ err: errMsg, chatId }, 'Failed to process message')

    if (queueMsg) {
      await supabase
        .from('telegram_message_queue')
        .update({ status: 'failed', error: errMsg.slice(0, 500) })
        .eq('id', queueMsg.id)
    }

    await sendMessage(chatId, 'Sorry, failed to process your message. Please try again.').catch(
      () => {}
    )
  }

  return NextResponse.json({ ok: true })
}
