import { NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { initiateConnection, getStatus, disconnect } from '@/lib/messaging/whatsapp'

/**
 * POST: Initiate WhatsApp connection — triggers QR code generation.
 */
export async function POST() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
  }

  // Check if already linked
  const { data: existingLink } = await supabase
    .from('messaging_links')
    .select('id, is_verified, external_chat_id')
    .eq('user_id', user.id)
    .eq('channel_type', 'whatsapp')
    .single()

  if (existingLink?.is_verified) {
    return NextResponse.json(
      { error: 'already_linked', message: 'WhatsApp is already linked. Unlink first.' },
      { status: 409 }
    )
  }

  // Initiate connection on gateway
  try {
    const status = await initiateConnection(membership.team_id)

    // Upsert a pending messaging_link
    const serviceClient = createServiceRoleClient()
    await serviceClient.from('messaging_links').upsert(
      {
        user_id: user.id,
        team_id: membership.team_id,
        channel_type: 'whatsapp',
        external_chat_id: '',
        is_verified: false,
      },
      { onConflict: 'user_id, channel_type' }
    )

    return NextResponse.json({
      status: status.status,
      qrCode: status.qrCode,
    })
  } catch (error) {
    console.error('[whatsapp/qr] Failed to initiate connection:', error)
    return NextResponse.json({ error: 'Failed to connect to WhatsApp gateway' }, { status: 502 })
  }
}

/**
 * GET: Poll connection status / QR code.
 */
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
  }

  try {
    const status = await getStatus(membership.team_id)

    // If connected, update the messaging_link to verified
    if (status.status === 'connected' && status.phoneNumber) {
      const serviceClient = createServiceRoleClient()
      await serviceClient
        .from('messaging_links')
        .update({
          external_chat_id: status.phoneNumber,
          is_verified: true,
          verification_code: null,
          verification_expires_at: null,
        })
        .eq('user_id', user.id)
        .eq('channel_type', 'whatsapp')
    }

    return NextResponse.json({
      status: status.status,
      qrCode: status.qrCode,
      phoneNumber: status.phoneNumber,
    })
  } catch (error) {
    console.error('[whatsapp/qr] Failed to get status:', error)
    return NextResponse.json({ status: 'disconnected' })
  }
}

/**
 * DELETE: Disconnect WhatsApp and unlink.
 */
export async function DELETE() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (membership) {
    // Disconnect on gateway
    await disconnect(membership.team_id).catch(() => {})
  }

  // Delete the messaging link
  await supabase
    .from('messaging_links')
    .delete()
    .eq('user_id', user.id)
    .eq('channel_type', 'whatsapp')

  return NextResponse.json({ success: true })
}
