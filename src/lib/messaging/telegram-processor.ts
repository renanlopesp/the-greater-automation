import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging/telegram'
import { runAgentChatSync } from '@/lib/ai/agent-chat'
import { buildPlatformTools, buildPlatformSystemPrompt } from '@/lib/ai/platform-tools'
import { tokensToCredits } from '@/lib/billing/credits'

/**
 * Process a Telegram message: run AI chat and send the response.
 * Shared between the webhook (for /link fast-path typing) and the queue processor.
 */
export async function processMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  link: { id: string; user_id: string; team_id: string; conversation_id: string | null },
  chatId: string,
  text: string,
  username: string
) {
  // Get team info for system prompt
  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', link.team_id)
    .single()

  const teamName = team?.name ?? 'Your workspace'

  // Fetch store data for retail context (if store exists)
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, segment, platform, platform_access_token')
    .eq('team_id', link.team_id)
    .single()

  const hasProducts = store
    ? ((
        await supabase
          .from('store_products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
      ).count ?? 0) > 0
    : false

  // Find or create conversation — only use the orchestrator agent.
  // Specialized agents (e.g. Carrinho & Conversão) should NOT receive
  // Telegram conversations directly — only the orchestrator or app UI
  // should interact with them.
  let conversationId = link.conversation_id

  if (!conversationId) {
    const { data: orchestratorAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('team_id', link.team_id)
      .eq('is_orchestrator', true)
      .limit(1)
      .single()

    if (orchestratorAgent) {
      const { data: conv } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: orchestratorAgent.id,
          user_id: link.user_id,
          created_by: link.user_id,
          is_active: true,
          title: `Telegram – @${username}`,
        })
        .select('id')
        .single()

      if (conv) {
        conversationId = conv.id
        // Store conversation_id on the link for future messages
        await supabase
          .from('messaging_links')
          .update({ conversation_id: conversationId })
          .eq('id', link.id)
      }
    }
    // No orchestrator → process statelessly (no conversation persistence).
    // The AI still responds, but messages won't appear under any agent's chat.
  }

  // Persist user message (only if we have a conversation)
  if (conversationId) {
    await supabase.from('agent_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: text,
      sender_id: link.user_id,
      metadata: { channel: 'telegram', chatId, username },
    })
  }

  // Load conversation history (last 20 messages) or just current message
  let modelMessages: Array<{ role: 'user' | 'assistant'; content: string }>

  if (conversationId) {
    const { data: historyRows } = await supabase
      .from('agent_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    modelMessages = (historyRows ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  } else {
    // Stateless — no orchestrator, just send current message
    modelMessages = [{ role: 'user', content: text }]
  }

  // Build platform tools + system prompt (pass service role client — no auth cookies in webhook)
  const platformTools = buildPlatformTools(link.user_id, link.team_id, supabase, store?.id)
  const systemPrompt = buildPlatformSystemPrompt(
    teamName,
    store
      ? {
          storeName: store.name,
          segment: store.segment,
          platform: store.platform,
          hasProducts,
        }
      : undefined
  )

  // Run AI with progressive messaging — intermediate updates are sent
  // to Telegram immediately as the AI works through tool calls.
  const result = await runAgentChatSync({
    userId: link.user_id,
    agent: {
      id: 'platform-assistant',
      name: 'Snew',
      system_prompt: null,
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 4096,
    },
    messages: modelMessages,
    systemPrompt,
    relayTools: platformTools,
    onIntermediateMessage: async (text) => {
      await sendMessage(chatId, text, 'Markdown').catch(() => {})
    },
  })

  const assistantText = result.text || 'I could not generate a response. Please try again.'

  // Persist assistant response (only if we have a conversation)
  if (conversationId) {
    await supabase.from('agent_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantText,
      metadata: { channel: 'telegram', chatId, username, usage: result.usage },
    })
  }

  // Track AI credits
  const credits = tokensToCredits(result.usage.totalTokens)
  if (credits > 0 && link.team_id) {
    await supabase.rpc('increment_ai_credits', {
      p_team_id: link.team_id,
      p_credits: credits,
    })
  }

  // Send response back to Telegram (with Markdown for bold/italic/code)
  await sendMessage(chatId, assistantText, 'Markdown')
}
