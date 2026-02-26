import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  metadata: Record<string, unknown>
  created_at: string | null
  sender_id: string | null
  sender_name: string | null
  sender_avatar: string | null
}

export async function getActiveConversation(
  supabase: Client,
  agentId: string,
  userId: string
): Promise<{ conversationId: string; messages: AgentMessage[] } | null> {
  const { data: conversation } = await supabase
    .from('agent_conversations')
    .select('*')
    .eq('agent_id', agentId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!conversation) return null

  const messages = await getConversationMessages(supabase, conversation.id)

  return {
    conversationId: conversation.id,
    messages,
  }
}

export async function getConversationMessages(
  supabase: Client,
  conversationId: string,
  limit: number = 50
): Promise<AgentMessage[]> {
  const { data: messages } = await supabase
    .from('agent_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (!messages) return []

  const senderIds = [...new Set(messages.map((m) => m.sender_id).filter(Boolean))] as string[]

  const profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
  if (senderIds.length > 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', senderIds)
    for (const p of profileData ?? []) {
      profiles[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }
    }
  }

  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
    content: msg.content,
    metadata: (msg.metadata as Record<string, unknown>) ?? {},
    created_at: msg.created_at,
    sender_id: msg.sender_id ?? null,
    sender_name: msg.sender_id ? (profiles[msg.sender_id]?.full_name ?? null) : null,
    sender_avatar: msg.sender_id ? (profiles[msg.sender_id]?.avatar_url ?? null) : null,
  }))
}
