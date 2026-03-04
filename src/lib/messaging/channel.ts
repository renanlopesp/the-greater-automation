import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage as sendTelegramMessage } from './telegram'
import { sendMessage as sendWhatsAppMessage } from './whatsapp'

export type ChannelType = 'telegram' | 'whatsapp'

export interface VerifiedLink {
  channel_type: string
  external_chat_id: string
}

/**
 * Get all verified messaging links for a team.
 */
export async function getVerifiedLinks(teamId: string): Promise<VerifiedLink[]> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('messaging_links')
    .select('channel_type, external_chat_id')
    .eq('team_id', teamId)
    .eq('is_verified', true)

  return data ?? []
}

/**
 * Send a message to ALL verified messaging channels for a team.
 * Uses Promise.allSettled so one channel failure doesn't block others.
 */
export async function sendToAllChannels(
  teamId: string,
  text: string,
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
): Promise<void> {
  const links = await getVerifiedLinks(teamId)

  if (links.length === 0) return

  await Promise.allSettled(
    links.map((link) => {
      switch (link.channel_type) {
        case 'telegram':
          return sendTelegramMessage(link.external_chat_id, text, parseMode)
        case 'whatsapp':
          return sendWhatsAppMessage(teamId, link.external_chat_id, text)
        default:
          return Promise.resolve()
      }
    })
  )
}

/**
 * Send a message to a specific channel type for a team.
 * Returns false if no verified link found.
 */
export async function sendToChannel(
  teamId: string,
  channelType: ChannelType,
  text: string,
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data: link } = await supabase
    .from('messaging_links')
    .select('external_chat_id')
    .eq('team_id', teamId)
    .eq('channel_type', channelType)
    .eq('is_verified', true)
    .single()

  if (!link?.external_chat_id) return false

  switch (channelType) {
    case 'telegram':
      await sendTelegramMessage(link.external_chat_id, text, parseMode)
      return true
    case 'whatsapp':
      await sendWhatsAppMessage(teamId, link.external_chat_id, text)
      return true
    default:
      return false
  }
}
