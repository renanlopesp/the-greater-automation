interface AIStepConfig {
  ai_action: 'summarize' | 'classify' | 'extract' | 'generate' | 'transform'
  prompt_template: string
  output_format: 'text' | 'json' | 'markdown'
  temperature: number
  max_tokens: number
}

export interface AIExecutionResult {
  success: boolean
  content: string
  model?: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  error?: string
}

/**
 * Execute an AI step using the Kiro Chat API
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
  // Supports both simple {{key}} and dot-notation {{key.field}} placeholders
  let userPrompt = config.prompt_template
  if (context) {
    // First resolve dot-notation paths (e.g. {{prev.content}}, {{step_2.output.url}})
    userPrompt = userPrompt.replace(/\{\{([\w.]+)\}\}/g, (match, path: string) => {
      const keys = path.split('.')
      let current: unknown = context
      for (const k of keys) {
        if (current == null || typeof current !== 'object') return match
        current = (current as Record<string, unknown>)[k]
      }
      if (current === undefined) return match
      return typeof current === 'object' && current !== null
        ? JSON.stringify(current, null, 2)
        : String(current)
    })

    // Then resolve simple {{key}} placeholders for any remaining
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{{${key}}}`
      const serialized =
        typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value)
      userPrompt = userPrompt.replaceAll(placeholder, serialized)
    }

    // Always append trigger data as context if available and not already interpolated
    if (context.trigger && !config.prompt_template.includes('{{trigger}}')) {
      const triggerJson = JSON.stringify(context.trigger, null, 2)
      userPrompt += `\n\n--- Trigger Event Data ---\n${triggerJson}`
    }

    // Append previous step outputs as context if available
    const stepKeys = Object.keys(context).filter((k) => k.startsWith('step_'))
    for (const key of stepKeys) {
      if (!config.prompt_template.includes(`{{${key}}}`)) {
        const stepJson = JSON.stringify(context[key], null, 2)
        userPrompt += `\n\n--- ${key} output ---\n${stepJson}`
      }
    }
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

    // Parse chat API response
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
