import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { processMessage } from '@/lib/messaging/telegram-processor'
import { sendMessage } from '@/lib/messaging/telegram'

// Allow up to 120s for AI + tool execution (Composio API calls can be slow).
export const maxDuration = 120

/**
 * Queue worker endpoint for Telegram messages.
 * Called by pg_net trigger on telegram_message_queue INSERT,
 * or by the retry cron for failed messages.
 */
export async function POST(request: NextRequest) {
  // 1. Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { message_id?: string; retry?: boolean }
  const supabase = createServiceRoleClient()

  // 2. Handle retry mode — find oldest failed message with attempts < 3
  if (body.retry) {
    const { data: failedMsg } = await supabase
      .from('telegram_message_queue')
      .select('id')
      .eq('status', 'failed')
      .lt('attempts', 3)
      .gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!failedMsg) {
      return NextResponse.json({ ok: true, message: 'No failed messages to retry' })
    }

    body.message_id = failedMsg.id
  }

  if (!body.message_id) {
    return NextResponse.json({ error: 'Missing message_id' }, { status: 400 })
  }

  // 3. Atomically claim the message (pending → processing)
  const { data: msg, error: claimError } = await supabase
    .from('telegram_message_queue')
    .update({ status: 'processing', attempts: undefined })
    .eq('id', body.message_id)
    .in('status', ['pending', 'failed'])
    .select(
      'id, chat_id, message_text, username, link_id, status, attempts, error, created_at, processed_at'
    )
    .single()

  if (claimError || !msg) {
    return NextResponse.json({ ok: true, message: 'Message already claimed or not found' })
  }

  // Increment attempts separately (Supabase doesn't support col + 1 in update)
  await supabase
    .from('telegram_message_queue')
    .update({ attempts: (msg.attempts as number) + 1 })
    .eq('id', msg.id)

  // 4. Fetch the messaging link
  if (!msg.link_id) {
    await supabase
      .from('telegram_message_queue')
      .update({ status: 'failed', error: 'No link_id on queue message' })
      .eq('id', msg.id)
    return NextResponse.json({ error: 'No link_id' }, { status: 400 })
  }

  const { data: link } = await supabase
    .from('messaging_links')
    .select('id, user_id, team_id, conversation_id')
    .eq('id', msg.link_id)
    .single()

  if (!link) {
    await supabase
      .from('telegram_message_queue')
      .update({ status: 'failed', error: 'Messaging link not found' })
      .eq('id', msg.id)
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }

  // 5. Process the message
  try {
    await processMessage(
      supabase,
      link,
      msg.chat_id as string,
      msg.message_text as string,
      (msg.username as string) ?? 'unknown'
    )

    // 6. Mark as completed
    await supabase
      .from('telegram_message_queue')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', msg.id)

    return NextResponse.json({ ok: true, message_id: msg.id, status: 'completed' })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[telegram/process] Error processing message ${msg.id}:`, errMsg)

    // Mark as failed
    await supabase
      .from('telegram_message_queue')
      .update({ status: 'failed', error: errMsg.slice(0, 500) })
      .eq('id', msg.id)

    // Send error to user
    await sendMessage(
      msg.chat_id as string,
      'Sorry, something went wrong. Please try again later.'
    ).catch(() => {})

    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
