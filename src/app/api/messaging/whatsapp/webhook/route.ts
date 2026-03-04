import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging/whatsapp'

const GATEWAY_SECRET = process.env.WHATSAPP_GATEWAY_SECRET

interface WhatsAppWebhookPayload {
  teamId: string
  from: string // JID: "5511999999999@s.whatsapp.net"
  senderName: string
  text: string
  messageId: string
  timestamp: number
}

/**
 * WhatsApp webhook handler.
 * Receives incoming messages forwarded by the Baileys gateway.
 * Messages are queued for async processing via pg_net trigger.
 */
export async function POST(request: NextRequest) {
  // 1. Verify gateway secret
  if (!GATEWAY_SECRET) {
    console.error('[whatsapp/webhook] WHATSAPP_GATEWAY_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const secretHeader = request.headers.get('x-whatsapp-gateway-secret')
  if (secretHeader !== GATEWAY_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let payload: WhatsAppWebhookPayload
  try {
    payload = (await request.json()) as WhatsAppWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!payload.text || !payload.from) {
    return NextResponse.json({ ok: true })
  }

  // Extract phone number from JID (strip @s.whatsapp.net)
  const phoneNumber = payload.from.split('@')[0]
  const senderName = payload.senderName || phoneNumber

  const supabase = createServiceRoleClient()

  // Look up verified link for this phone number
  const { data: link } = await supabase
    .from('messaging_links')
    .select('id, user_id, team_id, conversation_id')
    .eq('channel_type', 'whatsapp')
    .eq('external_chat_id', phoneNumber)
    .eq('is_verified', true)
    .single()

  if (!link) {
    // No linked account — can't process. Gateway shouldn't forward these
    // but handle gracefully.
    return NextResponse.json({ ok: true })
  }

  // Queue message for async processing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase as any).from('whatsapp_message_queue').insert({
    phone_number: phoneNumber,
    message_text: payload.text.trim(),
    sender_name: senderName,
    link_id: link.id,
  })

  if (insertError) {
    console.error('[whatsapp/webhook] Failed to queue message:', insertError)
    await sendMessage(
      link.team_id,
      phoneNumber,
      'Sorry, failed to process your message. Please try again.'
    ).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
