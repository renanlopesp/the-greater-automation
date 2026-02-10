'use step'

import { FatalError } from 'workflow'
import type { AIStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface AIStepOutput {
  content: string
  tokens_used?: number
  model?: string
}

export async function aiStep(config: AIStepConfig): Promise<AIStepOutput> {
  const { ai_action, prompt_template, output_format, temperature, max_tokens } = config

  // TODO: Replace with actual AI provider integration
  // For now, this is a placeholder that demonstrates the structure

  // Validate required fields
  if (!prompt_template) {
    throw new FatalError('AI step requires a prompt template')
  }

  // In a real implementation, you would:
  // 1. Get API key from environment or secure storage
  // 2. Call OpenAI/Anthropic/other AI provider API
  // 3. Handle rate limits and retries appropriately

  try {
    // Placeholder response - replace with actual AI API call
    const response = await simulateAICall({
      action: ai_action,
      prompt: prompt_template,
      format: output_format,
      temperature,
      maxTokens: max_tokens,
    })

    return {
      content: response.content,
      tokens_used: response.tokensUsed,
      model: response.model,
    }
  } catch (error) {
    if (error instanceof FatalError) {
      throw error
    }

    if (error instanceof Error) {
      // Check for known non-retryable errors
      if (
        error.message.includes('invalid') ||
        error.message.includes('unauthorized') ||
        error.message.includes('quota')
      ) {
        throw new FatalError(`AI request failed: ${error.message}`)
      }
      throw error
    }

    throw new Error('AI step failed')
  }
}

// Placeholder function - replace with actual AI provider integration
async function simulateAICall(params: {
  action: string
  prompt: string
  format: string
  temperature: number
  maxTokens: number
}): Promise<{ content: string; tokensUsed: number; model: string }> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Return mock response based on action type
  const mockResponses: Record<string, string> = {
    summarize: 'This is a summary of the input text.',
    classify: 'Category: General',
    extract: 'Extracted data: [sample data]',
    generate: 'Generated content based on the prompt.',
    transform: 'Transformed output',
  }

  const content = mockResponses[params.action] || 'AI response'

  return {
    content:
      params.format === 'json'
        ? JSON.stringify({ result: content })
        : params.format === 'markdown'
          ? `# Result\n\n${content}`
          : content,
    tokensUsed: 150,
    model: 'gpt-4',
  }
}
