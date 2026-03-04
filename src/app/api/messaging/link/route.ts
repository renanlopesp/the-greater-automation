import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** POST: Generate a verification code for linking a messaging channel to a Relay account. */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel') || 'telegram'

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
      .eq('channel_type', channel)
      .single(),
  ])

  if (!membership) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
  }

  if (existingLink?.is_verified) {
    return NextResponse.json(
      {
        error: 'already_linked',
        message: `Your ${channel} (@${existingLink.external_username ?? 'unknown'}) is already linked. Unlink first to generate a new code.`,
      },
      { status: 409 }
    )
  }

  if (channel === 'whatsapp') {
    // WhatsApp uses a QR code flow instead of a verification code
    return NextResponse.json({
      instructions: [
        'Open WhatsApp and scan the QR code below',
        'Or click the link to open WhatsApp Web',
        'Send a message to start the linking process',
      ],
      channel: 'whatsapp',
    })
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
        channel_type: channel,
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
    console.error('[messaging/link] upsert error:', error)
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
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel') || 'telegram'

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
    .eq('channel_type', channel)
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
    externalUsername: link.external_username,
    conversationId: link.conversation_id,
    createdAt: link.created_at,
  })
}

/** DELETE: Unlink a messaging channel from Relay account. */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel') || 'telegram'

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('messaging_links')
    .delete()
    .eq('user_id', user.id)
    .eq('channel_type', channel)

  if (error) {
    return NextResponse.json({ error: 'Failed to unlink' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
