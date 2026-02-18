'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getActiveConversation, type AgentMessage } from '@/lib/queries/agent-conversations'

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

  return getActiveConversation(supabase, agentId)
}
