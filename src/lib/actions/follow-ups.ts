'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Generates contextual follow-up suggestions based on the last assistant message.
 * Uses claude-haiku for fast, cheap generation.
 */
export async function generateFollowUps(lastMessage: string, agentName: string): Promise<string[]> {
  // Auth check — prevent unauthenticated API credit consumption
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return []

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `You help generate follow-up suggestions for a chat with "${agentName}", an e-commerce specialist agent.

Based on the assistant's last response, generate 3-4 short follow-up questions or actions the user might want next.

Rules:
- In Portuguese (pt-BR)
- Max 40 characters each
- Specific to what was discussed (not generic)
- Actionable
- Respond ONLY with a JSON array of strings, nothing else. Example: ["Sugestão 1", "Sugestão 2", "Sugestão 3"]

Last response:
${lastMessage.slice(0, 1500)}`,
        },
      ],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = JSON.parse(text.trim())
    if (Array.isArray(parsed)) return parsed.map(String).slice(0, 4)
    if (parsed?.suggestions) return parsed.suggestions.map(String).slice(0, 4)
    return []
  } catch {
    return []
  }
}
