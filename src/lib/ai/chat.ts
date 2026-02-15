import type { AIStepConfig } from '@/lib/workflow-editor/step-defaults'

export interface AIExecutionResult {
  success: boolean
  content: string
  model?: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  error?: string
}

/**
 * Execute an AI step using the Kiro Chat API (OpenAI-compatible)
 * Server-side only - uses process.env for credentials
 */
export async function executeAIStep(
  config: AIStepConfig,
  context?: Record<string, unknown>
): Promise<AIExecutionResult> {
  const apiUrl = process.env.KIRO_CHAT_URL
  const authToken = process.env.KIRO_CHAT_AUTH_TOKEN

  if (!apiUrl || !authToken) {
    return {
      success: false,
      content: '',
      error: 'Missing KIRO_CHAT_URL or KIRO_CHAT_AUTH_TOKEN environment variables',
    }
  }

  // Build system prompt based on AI action type
  const systemPrompts: Record<AIStepConfig['ai_action'], string> = {
    summarize:
      'You are a summarization assistant. Provide clear, concise summaries of the given text.',
    classify:
      'You are a text classifier. Analyze the input and classify it according to the instructions.',
    extract:
      'You are a data extraction assistant. Extract the requested information from the given text.',
    generate:
      'You are a content generation assistant. Create content based on the provided instructions.',
    transform:
      'You are a text transformation assistant. Transform the input according to the given instructions.',
  }

  const systemPrompt = systemPrompts[config.ai_action]

  // Interpolate context variables in prompt template
  let userPrompt = config.prompt_template
  if (context) {
    Object.entries(context).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      const serialized =
        typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value)
      userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), serialized)
    })
  }

  // Add output format instruction
  const formatInstructions: Record<AIStepConfig['output_format'], string> = {
    text: 'Respond in plain text format.',
    json: 'Respond in valid JSON format only, without markdown code blocks.',
    markdown: 'Respond in markdown format.',
  }

  const fullUserPrompt = `${userPrompt}\n\n${formatInstructions[config.output_format]}`

  // Create abort controller for timeout (30 seconds)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        model: 'kiro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullUserPrompt },
        ],
        temperature: config.temperature,
        max_tokens: config.max_tokens,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        content: '',
        error: `API request failed with status ${response.status}: ${errorText}`,
      }
    }

    const data = await response.json()

    // Parse OpenAI-compatible response
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return {
        success: false,
        content: '',
        error: 'Invalid response format from AI API',
      }
    }

    const content = data.choices[0].message.content || ''
    const usage = data.usage
      ? {
          prompt_tokens: data.usage.prompt_tokens || 0,
          completion_tokens: data.usage.completion_tokens || 0,
          total_tokens: data.usage.total_tokens || 0,
        }
      : undefined

    return {
      success: true,
      content,
      model: data.model,
      usage,
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          content: '',
          error: 'AI request timed out after 30 seconds',
        }
      }
      return {
        success: false,
        content: '',
        error: error.message,
      }
    }

    return {
      success: false,
      content: '',
      error: 'Unknown error occurred during AI execution',
    }
  }
}
