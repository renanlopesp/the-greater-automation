import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

/**
 * Get the OpenAI provider for GPT models.
 */
export function getOpenAIProvider() {
  const apiKey = process.env.OPEN_AI_API_KEY
  if (!apiKey) {
    throw new Error('OPEN_AI_API_KEY environment variable is required')
  }
  return createOpenAI({ apiKey })
}

/**
 * Get the Anthropic provider for Claude models.
 */
export function getAnthropicProvider() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required')
  }
  return createAnthropic({ apiKey })
}
