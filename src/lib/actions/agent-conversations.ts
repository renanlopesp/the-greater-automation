'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getLatestConversation, type AgentMessage } from '@/lib/queries/agent-conversations'

export interface ConversationHistoryResult {
  conversationId: string
  messages: AgentMessage[]
}

export async function loadConversationHistory(
  agentId: string
): Promise<ConversationHistoryResult | null> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return getLatestConversation(supabase, agentId, user.id)
}
