import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeAIStep } from '@/lib/ai/chat'
import type { AIStepConfig } from '@/lib/workflow-editor/step-defaults'

describe('executeAIStep', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.KIRO_CHAT_URL = 'https://test.api.com/v1/chat/completions'
    process.env.KIRO_CHAT_AUTH_TOKEN = 'test-token-123'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should successfully execute AI step with valid response', async () => {
    const mockResponse = {
      model: 'kiro',
      choices: [
        {
          message: {
            content: 'This is a summary of the text.',
          },
        },
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 20,
        total_tokens: 70,
      },
    }

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'summarize',
      prompt_template: 'Summarize the following: test content',
      output_format: 'text',
      temperature: 0.7,
      max_tokens: 1000,
    }

    const result = await executeAIStep(config)

    expect(result.success).toBe(true)
    expect(result.content).toBe('This is a summary of the text.')
    expect(result.model).toBe('kiro')
    expect(result.usage).toEqual({
      prompt_tokens: 50,
      completion_tokens: 20,
      total_tokens: 70,
    })
    expect(result.error).toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.api.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
      })
    )
  })

  it('should return error when KIRO_CHAT_URL is missing', async () => {
    delete process.env.KIRO_CHAT_URL

    const config: AIStepConfig = {
      ai_action: 'summarize',
      prompt_template: 'Test prompt',
      output_format: 'text',
      temperature: 0.7,
      max_tokens: 1000,
    }

    const result = await executeAIStep(config)

    expect(result.success).toBe(false)
    expect(result.content).toBe('')
    expect(result.error).toBe('Missing KIRO_CHAT_URL or KIRO_CHAT_AUTH_TOKEN environment variables')
  })

  it('should return error when KIRO_CHAT_AUTH_TOKEN is missing', async () => {
    delete process.env.KIRO_CHAT_AUTH_TOKEN

    const config: AIStepConfig = {
      ai_action: 'summarize',
      prompt_template: 'Test prompt',
      output_format: 'text',
      temperature: 0.7,
      max_tokens: 1000,
    }

    const result = await executeAIStep(config)

    expect(result.success).toBe(false)
    expect(result.content).toBe('')
    expect(result.error).toBe('Missing KIRO_CHAT_URL or KIRO_CHAT_AUTH_TOKEN environment variables')
  })

  it('should return error when API returns error status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'classify',
      prompt_template: 'Classify this text',
      output_format: 'json',
      temperature: 0.5,
      max_tokens: 500,
    }

    const result = await executeAIStep(config)

    expect(result.success).toBe(false)
    expect(result.content).toBe('')
    expect(result.error).toBe('API request failed with status 500: Internal Server Error')
  })

  it('should return error when API returns invalid response format', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ invalid: true }),
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'extract',
      prompt_template: 'Extract data',
      output_format: 'json',
      temperature: 0.3,
      max_tokens: 800,
    }

    const result = await executeAIStep(config)

    expect(result.success).toBe(false)
    expect(result.content).toBe('')
    expect(result.error).toBe('Invalid response format from AI API')
  })

  it('should handle timeout with AbortError', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'

    vi.spyOn(global, 'fetch').mockRejectedValue(abortError)

    const config: AIStepConfig = {
      ai_action: 'generate',
      prompt_template: 'Generate content',
      output_format: 'markdown',
      temperature: 0.8,
      max_tokens: 2000,
    }

    const result = await executeAIStep(config)

    expect(result.success).toBe(false)
    expect(result.content).toBe('')
    expect(result.error).toBe('AI request timed out after 30 seconds')
  })

  it('should interpolate context variables in prompt template', async () => {
    const mockResponse = {
      model: 'kiro',
      choices: [{ message: { content: 'Processed content' } }],
    }

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'transform',
      prompt_template: 'Transform {{input_text}} using {{method}} method',
      output_format: 'text',
      temperature: 0.7,
      max_tokens: 1000,
    }

    const context = {
      input_text: 'sample data',
      method: 'uppercase',
    }

    await executeAIStep(config, context)

    const callBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')

    expect(userMessage.content).toContain('Transform sample data using uppercase method')
  })

  it('should use correct system prompt for summarize action', async () => {
    const mockResponse = {
      model: 'kiro',
      choices: [{ message: { content: 'Summary' } }],
    }

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'summarize',
      prompt_template: 'Summarize this',
      output_format: 'text',
      temperature: 0.7,
      max_tokens: 1000,
    }

    await executeAIStep(config)

    const callBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    const systemMessage = callBody.messages.find((m: { role: string }) => m.role === 'system')

    expect(systemMessage.content).toBe(
      'You are a summarization assistant. Provide clear, concise summaries of the given text.'
    )
  })

  it('should use correct system prompt for classify action', async () => {
    const mockResponse = {
      model: 'kiro',
      choices: [{ message: { content: 'Classification' } }],
    }

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'classify',
      prompt_template: 'Classify this',
      output_format: 'text',
      temperature: 0.7,
      max_tokens: 1000,
    }

    await executeAIStep(config)

    const callBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    const systemMessage = callBody.messages.find((m: { role: string }) => m.role === 'system')

    expect(systemMessage.content).toBe(
      'You are a text classifier. Analyze the input and classify it according to the instructions.'
    )
  })

  it('should use correct system prompt for extract action', async () => {
    const mockResponse = {
      model: 'kiro',
      choices: [{ message: { content: 'Extracted data' } }],
    }

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'extract',
      prompt_template: 'Extract data',
      output_format: 'text',
      temperature: 0.7,
      max_tokens: 1000,
    }

    await executeAIStep(config)

    const callBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    const systemMessage = callBody.messages.find((m: { role: string }) => m.role === 'system')

    expect(systemMessage.content).toBe(
      'You are a data extraction assistant. Extract the requested information from the given text.'
    )
  })

  it('should use correct system prompt for generate action', async () => {
    const mockResponse = {
      model: 'kiro',
      choices: [{ message: { content: 'Generated content' } }],
    }

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'generate',
      prompt_template: 'Generate content',
      output_format: 'text',
      temperature: 0.7,
      max_tokens: 1000,
    }

    await executeAIStep(config)

    const callBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    const systemMessage = callBody.messages.find((m: { role: string }) => m.role === 'system')

    expect(systemMessage.content).toBe(
      'You are a content generation assistant. Create content based on the provided instructions.'
    )
  })

  it('should use correct system prompt for transform action', async () => {
    const mockResponse = {
      model: 'kiro',
      choices: [{ message: { content: 'Transformed text' } }],
    }

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'transform',
      prompt_template: 'Transform text',
      output_format: 'text',
      temperature: 0.7,
      max_tokens: 1000,
    }

    await executeAIStep(config)

    const callBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    const systemMessage = callBody.messages.find((m: { role: string }) => m.role === 'system')

    expect(systemMessage.content).toBe(
      'You are a text transformation assistant. Transform the input according to the given instructions.'
    )
  })

  it('should append text format instruction to prompt', async () => {
    const mockResponse = {
      model: 'kiro',
      choices: [{ message: { content: 'Response' } }],
    }

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'summarize',
      prompt_template: 'Summarize this',
      output_format: 'text',
      temperature: 0.7,
      max_tokens: 1000,
    }

    await executeAIStep(config)

    const callBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')

    expect(userMessage.content).toContain('Respond in plain text format.')
  })

  it('should append json format instruction to prompt', async () => {
    const mockResponse = {
      model: 'kiro',
      choices: [{ message: { content: '{}' } }],
    }

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'extract',
      prompt_template: 'Extract fields',
      output_format: 'json',
      temperature: 0.7,
      max_tokens: 1000,
    }

    await executeAIStep(config)

    const callBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')

    expect(userMessage.content).toContain(
      'Respond in valid JSON format only, without markdown code blocks.'
    )
  })

  it('should append markdown format instruction to prompt', async () => {
    const mockResponse = {
      model: 'kiro',
      choices: [{ message: { content: '# Header' } }],
    }

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response)

    const config: AIStepConfig = {
      ai_action: 'generate',
      prompt_template: 'Generate document',
      output_format: 'markdown',
      temperature: 0.7,
      max_tokens: 1000,
    }

    await executeAIStep(config)

    const callBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')

    expect(userMessage.content).toContain('Respond in markdown format.')
  })
})
