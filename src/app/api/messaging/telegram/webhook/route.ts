import { NextRequest, NextResponse, after } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMessage, sendChatAction, type TelegramUpdate } from '@/lib/messaging/telegram'
import { runAgentChatSync } from '@/lib/ai/agent-chat'
import { buildPlatformTools, buildPlatformSystemPrompt } from '@/lib/ai/platform-tools'
import { tokensToCredits } from '@/lib/billing/credits'

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''

/**
 * Telegram Bot webhook handler.
 * The bot acts as a PLATFORM assistant — not tied to any single agent.
 * It has access to the full workspace: agents, workflows, skills, integrations.
 */
export async function POST(request: NextRequest) {
  // 1. Verify webhook secret
  const secretHeader = request.headers.get('x-telegram-bot-api-secret-token')
  if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const update = (await request.json()) as TelegramUpdate

  // Only handle text messages
  if (!update.message?.text || !update.message.from) {
    return NextResponse.json({ ok: true })
  }

  const chatId = String(update.message.chat.id)
  const text = update.message.text.trim()
  const username = update.message.from.username ?? update.message.from.first_name

  const supabase = createServiceRoleClient()

  // 2. Handle /start command
  if (text === '/start') {
    await sendMessage(
      chatId,
      [
        'Welcome to Snew! I am your AI automation assistant.',
        '',
        'To get started, link your account:',
        '1. Go to your dashboard → Messaging',
        '2. Click "Generate Code"',
        '3. Send me: /link YOUR_CODE',
        '',
        'Once linked, you can manage your entire workspace from here — agents, workflows, skills, and integrations.',
      ].join('\n')
    )
    return NextResponse.json({ ok: true })
  }

  // 3. Handle /link CODE command
  if (text.startsWith('/link ')) {
    const code = text.slice(6).trim()
    if (!code || code.length !== 6) {
      await sendMessage(chatId, 'Please provide a valid 6-digit code: /link 123456')
      return NextResponse.json({ ok: true })
    }

    // Find pending link with this code
    const { data: link } = await supabase
      .from('messaging_links')
      .select('id, verification_expires_at')
      .eq('verification_code', code)
      .eq('is_verified', false)
      .single()

    if (!link) {
      await sendMessage(
        chatId,
        'Invalid or expired code. Please generate a new one from your dashboard.'
      )
      return NextResponse.json({ ok: true })
    }

    // Check expiry
    if (link.verification_expires_at && new Date(link.verification_expires_at) < new Date()) {
      await sendMessage(
        chatId,
        'This code has expired. Please generate a new one from your dashboard.'
      )
      return NextResponse.json({ ok: true })
    }

    // Activate the link
    await supabase
      .from('messaging_links')
      .update({
        external_chat_id: chatId,
        external_username: username,
        is_verified: true,
        verification_code: null,
        verification_expires_at: null,
      })
      .eq('id', link.id)

    await sendMessage(
      chatId,
      'Account linked successfully! You now have full access to your workspace. Try asking me to list your agents or workflows.'
    )
    return NextResponse.json({ ok: true })
  }

  // 4. Look up verified link for this chat
  const { data: link } = await supabase
    .from('messaging_links')
    .select('id, user_id, team_id, conversation_id')
    .eq('channel_type', 'telegram')
    .eq('external_chat_id', chatId)
    .eq('is_verified', true)
    .single()

  if (!link) {
    await sendMessage(
      chatId,
      'Your Telegram is not linked to an account. Use /start to see how to link it.'
    )
    return NextResponse.json({ ok: true })
  }

  // 5. Send typing indicator (fire-and-forget)
  sendChatAction(chatId).catch(() => {})

  // Return 200 immediately — process AI in after() to avoid Telegram timeout
  after(async () => {
    try {
      console.log(`[telegram/webhook] Processing message from ${username}: "${text}"`)
      await processMessage(supabase, link, chatId, text, username)
      console.log(`[telegram/webhook] Message processed successfully`)
    } catch (err) {
      console.error('[telegram/webhook] Error processing message:', err)
      const errMsg = err instanceof Error ? err.message : String(err)
      await sendMessage(chatId, `Sorry, something went wrong: ${errMsg.slice(0, 200)}`).catch(
        () => {}
      )
    }
  })

  return NextResponse.json({ ok: true })
}

async function processMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  link: { id: string; user_id: string; team_id: string; conversation_id: string | null },
  chatId: string,
  text: string,
  username: string
) {
  // 6. Get team info for system prompt
  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', link.team_id)
    .single()

  const teamName = team?.name ?? 'Your workspace'

  // 7. Find or create conversation (not tied to any specific agent)
  let conversationId = link.conversation_id

  if (!conversationId) {
    // We need an agent_id for agent_conversations (FK constraint).
    // Use the first agent in the team as the conversation host.
    const { data: firstAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('team_id', link.team_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!firstAgent) {
      await sendMessage(
        chatId,
        'No agents found in your workspace. Create one first in the dashboard.'
      )
      return
    }

    const { data: conv } = await supabase
      .from('agent_conversations')
      .insert({
        agent_id: firstAgent.id,
        user_id: link.user_id,
        created_by: link.user_id,
        is_active: true,
        title: `Telegram – @${username}`,
      })
      .select('id')
      .single()

    if (!conv) {
      await sendMessage(chatId, 'Failed to create conversation. Please try again.')
      return
    }

    conversationId = conv.id

    // Store conversation_id on the link for future messages
    await supabase
      .from('messaging_links')
      .update({ conversation_id: conversationId })
      .eq('id', link.id)
  }

  // 8. Persist user message
  await supabase.from('agent_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: text,
    sender_id: link.user_id,
    metadata: { channel: 'telegram', chatId, username },
  })

  // 9. Load conversation history (last 20 messages)
  const { data: historyRows } = await supabase
    .from('agent_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20)

  const modelMessages = (historyRows ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  // 10. Build platform tools + system prompt (pass service role client — no auth cookies in webhook)
  const platformTools = buildPlatformTools(link.user_id, link.team_id, supabase)
  const systemPrompt = buildPlatformSystemPrompt(teamName)

  // 11. Run AI (non-streaming) with platform identity
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
  })

  const assistantText = result.text || 'I could not generate a response. Please try again.'

  // 12. Persist assistant response
  await supabase.from('agent_messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: assistantText,
    metadata: { channel: 'telegram', usage: result.usage },
  })

  // 13. Track AI credits
  const credits = tokensToCredits(result.usage.totalTokens)
  if (credits > 0 && link.team_id) {
    await supabase.rpc('increment_ai_credits', {
      p_team_id: link.team_id,
      p_credits: credits,
    })
  }

  // 14. Send response back to Telegram
  await sendMessage(chatId, assistantText)
}
