import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/messaging/link')

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** POST: Generate a verification code for linking Telegram to a Relay account. */
export async function POST() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch team and existing link in parallel (both only depend on user.id)
  const [{ data: membership }, { data: existingLink }] = await Promise.all([
    supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1).single(),
    supabase
      .from('messaging_links')
      .select('id, is_verified, external_username')
      .eq('user_id', user.id)
      .eq('channel_type', 'telegram')
      .single(),
  ])

  if (!membership) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
  }

  if (existingLink?.is_verified) {
    return NextResponse.json(
      {
        error: 'already_linked',
        message: `Your Telegram (@${existingLink.external_username ?? 'unknown'}) is already linked. Unlink first to generate a new code.`,
      },
      { status: 409 }
    )
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

  // Upsert — one link per user per channel type
  const { data: link, error } = await supabase
    .from('messaging_links')
    .upsert(
      {
        user_id: user.id,
        team_id: membership.team_id,
        channel_type: 'telegram',
        external_chat_id: '', // filled when user sends /link
        is_verified: false,
        verification_code: code,
        verification_expires_at: expiresAt,
      },
      { onConflict: 'user_id, channel_type' }
    )
    .select('id, verification_code, verification_expires_at')
    .single()

  if (error) {
    log.error({ err: error }, 'Upsert error')
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
  }

  return NextResponse.json({
    code: link.verification_code,
    expiresAt: link.verification_expires_at,
    instructions: [
      'Open Telegram and search for @snew_ai_bot',
      'Start a conversation (send /start)',
      `Send: /link ${code}`,
      'Come back here — the status will update automatically',
    ],
  })
}

/** GET: Check current user's messaging link status. */
export async function GET() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: link } = await supabase
    .from('messaging_links')
    .select('id, channel_type, external_username, is_verified, conversation_id, created_at')
    .eq('user_id', user.id)
    .eq('channel_type', 'telegram')
    .single()

  if (!link) {
    return NextResponse.json({ status: 'not_linked' })
  }

  if (!link.is_verified) {
    return NextResponse.json({ status: 'pending', linkId: link.id })
  }

  return NextResponse.json({
    status: 'linked',
    linkId: link.id,
    telegramUsername: link.external_username,
    conversationId: link.conversation_id,
    createdAt: link.created_at,
  })
}

/** DELETE: Unlink Telegram from Relay account. */
export async function DELETE() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // FK on telegram_message_queue is ON DELETE CASCADE, so dependent rows
  // are automatically cleaned up when the messaging_link is deleted.
  const { error } = await supabase
    .from('messaging_links')
    .delete()
    .eq('user_id', user.id)
    .eq('channel_type', 'telegram')

  if (error) {
    return NextResponse.json({ error: 'Failed to unlink' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
