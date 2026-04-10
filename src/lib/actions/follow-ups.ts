'use server'

import { getAnthropicClient } from '@/lib/anthropic'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Generates contextual follow-up suggestions based on the last assistant message.
 * Uses claude-haiku for fast, cheap generation.
 */
export async function generateFollowUps(lastMessage: string, agentName: string): Promise<string[]> {
  // Quick auth check
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  if (!lastMessage || lastMessage.length < 10) return []

  try {
    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Gere 3-4 sugestões curtas de follow-up para uma conversa com "${agentName}" (assistente de e-commerce). Baseie-se na última resposta. Regras: PT-BR, max 40 chars cada, específicas, acionáveis. Responda APENAS com JSON array: ["sugestão1","sugestão2","sugestão3"]

Resposta:
${lastMessage.slice(0, 800)}`,
        },
      ],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    // Strip markdown fences if present (Haiku often wraps in ```json)
    const cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed.map(String).slice(0, 4) : []
  } catch {
    return []
  }
}
