import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  metadata: Record<string, unknown>
  created_at: string | null
}

export async function getLatestConversation(
  supabase: Client,
  agentId: string,
  userId: string
): Promise<{ conversationId: string; messages: AgentMessage[] } | null> {
  const { data: conversation } = await supabase
    .from('agent_conversations')
    .select('*')
    .eq('agent_id', agentId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
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

  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
    content: msg.content,
    metadata: (msg.metadata as Record<string, unknown>) ?? {},
    created_at: msg.created_at,
  }))
}
