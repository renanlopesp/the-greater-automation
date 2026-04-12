import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/messaging/telegram'
import { askAgent } from '@/lib/ai/agent-client'
import { tokensToCredits } from '@/lib/billing/credits'

/**
 * Process a Telegram message: run AI via Managed Agent and send the response.
 */
export async function processMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  link: { id: string; user_id: string; team_id: string; conversation_id: string | null },
  chatId: string,
  text: string,
  username: string
) {
  // Find or create conversation
  let conversationId = link.conversation_id

  if (!conversationId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conv } = await (supabase as any)
      .from('conversations')
      .insert({
        team_id: link.team_id,
        user_id: link.user_id,
        title: `Telegram – @${username}`,
        is_active: true,
      })
      .select('id')
      .single()

    if (conv) {
      conversationId = conv.id
      await supabase
        .from('messaging_links')
        .update({ conversation_id: conversationId })
        .eq('id', link.id)
    }
  }

  // Persist user message
  if (conversationId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('conversation_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: text,
      metadata: { channel: 'telegram', chatId, username },
    })
  }

  // Build prompt with conversation history
  let prompt = text
  if (conversationId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: historyRows } = await (supabase as any)
      .from('conversation_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    if (historyRows && historyRows.length > 1) {
      const history = historyRows
        .slice(0, -1) // exclude the message we just inserted
        .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
        .join('\n')
      prompt = `[Conversa anterior via Telegram]\n${history}\n\nuser: ${text}`
    }
  }

  // Run AI via Managed Agent (has brand DNA, MCP tools, full context)
  const result = await askAgent(link.team_id, prompt, {
    userId: link.user_id,
    timeout: 120_000,
  })

  // Strip internal UI markers (<!-- snew:followups ... -->, <!-- snew:artifact ... -->, etc.)
  const rawText = result.text || 'Não consegui gerar uma resposta. Tente novamente.'
  const assistantText = rawText.replace(/<!--\s*snew:\w+\s+[\s\S]*?-->/g, '').trim()

  // Persist assistant response
  if (conversationId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('conversation_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantText,
      metadata: { channel: 'telegram', chatId, username, usage: result.usage },
    })
  }

  // Track AI credits
  const credits = tokensToCredits(result.usage.inputTokens + result.usage.outputTokens)
  if (credits > 0) {
    await supabase.rpc('increment_ai_credits', {
      p_team_id: link.team_id,
      p_credits: credits,
    })
  }

  // Send response back to Telegram (sanitized for Telegram Markdown)
  const telegramText = sanitizeForTelegram(assistantText)
  await sendMessage(chatId, telegramText, 'Markdown')
}

/**
 * Sanitize AI-generated Markdown for Telegram's limited Markdown parser.
 * Telegram Markdown only supports: *bold*, _italic_, `code`, [link](url).
 * Everything else (headings, HR, tables, etc.) must be stripped or converted.
 */
function sanitizeForTelegram(text: string): string {
  return (
    text
      // Convert headings to bold text (## Title → *Title*)
      .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      // Collapse 3+ consecutive newlines to 2
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}
