'use server'

import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

/**
 * Generates contextual follow-up suggestions based on the last assistant message.
 * Uses gpt-4o-mini for fast, cheap generation (~200 tokens).
 */
export async function generateFollowUps(lastMessage: string, agentName: string): Promise<string[]> {
  const apiKey = process.env.OPEN_AI_API_KEY
  if (!apiKey) return []

  try {
    const openai = createOpenAI({ apiKey })
    const { object } = await generateObject({
      model: openai.chat('gpt-4o-mini'),
      schema: z.object({
        suggestions: z.array(z.string()).min(3).max(4),
      }),
      prompt: `You help generate follow-up suggestions for a chat with "${agentName}", an e-commerce specialist agent.

Based on the assistant's last response, generate 3-4 short follow-up questions or actions the user might want next.

Rules:
- In Portuguese (pt-BR)
- Max 40 characters each
- Specific to what was discussed (not generic)
- Actionable

Last response:
${lastMessage.slice(0, 1500)}`,
      maxOutputTokens: 200,
    })

    return object.suggestions
  } catch {
    return []
  }
}
