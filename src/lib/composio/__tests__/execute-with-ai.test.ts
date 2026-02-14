import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeAppStepWithAI } from '../execute-with-ai'

// Mock dependencies
vi.mock('../actions/get-app-actions')
vi.mock('../client')

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('executeAppStepWithAI', () => {
  const mockAppId = 'github'
  const mockInstructions = 'Create an issue titled "Bug Report"'
  const mockConnectionId = 'conn_123'

  const mockActions = [
    {
      name: 'GITHUB_CREATE_ISSUE',
      description: 'Create a new GitHub issue',
      params: [
        {
          key: 'owner',
          type: 'string',
          required: true,
          description: 'Repository owner',
        },
        {
          key: 'repo',
          type: 'string',
          required: true,
          description: 'Repository name',
        },
        {
          key: 'title',
          type: 'string',
          required: true,
          description: 'Issue title',
        },
        {
          key: 'body',
          type: 'string',
          required: false,
          description: 'Issue body',
        },
      ],
    },
    {
      name: 'GITHUB_LIST_REPOS',
      description: 'List GitHub repositories',
      params: [
        {
          key: 'username',
          type: 'string',
          required: true,
          description: 'GitHub username',
        },
      ],
    },
  ]

  const mockComposio = {
    tools: {
      execute: vi.fn(),
    },
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('KIRO_CHAT_URL', 'https://kiro.chat/api/v1/chat')
    vi.stubEnv('KIRO_CHAT_AUTH_TOKEN', 'test-token-123')

    // Reset mocks
    const { getAppActions } = vi.mocked(await import('../actions/get-app-actions'))
    getAppActions.mockResolvedValue(mockActions)

    const { getComposio } = vi.mocked(await import('../client'))
    getComposio.mockReturnValue(mockComposio as never)

    mockFetch.mockClear()
  })

  const createMockFetchResponse = (content: string) => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        {
          message: {
            content,
          },
        },
      ],
      model: 'kiro',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    }),
    text: async () => content,
  })

  it('calls Kiro Chat API with correct payload', async () => {
    const aiResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug Report' },
    })

    mockFetch.mockResolvedValue(createMockFetchResponse(aiResponse))
    mockComposio.tools.execute.mockResolvedValue({ successful: true, data: { id: 123 } })

    await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://kiro.chat/api/v1/chat',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
        body: expect.any(String),
      })
    )

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.model).toBe('kiro')
    expect(callBody.temperature).toBe(0.1)
    expect(callBody.max_tokens).toBe(1000)
    expect(callBody.messages).toHaveLength(2)
    expect(callBody.messages[0].role).toBe('system')
    expect(callBody.messages[0].content).toContain('action selection assistant')
    expect(callBody.messages[0].content).toContain('valid JSON')
    expect(callBody.messages[1].role).toBe('user')
    expect(callBody.messages[1].content).toContain('Available actions for github')
    expect(callBody.messages[1].content).toContain('GITHUB_CREATE_ISSUE')
    expect(callBody.messages[1].content).toContain(mockInstructions)
  })

  it('parses AI JSON response and extracts actionName and inputs', async () => {
    const aiResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'myrepo', title: 'Bug' },
    })

    mockFetch.mockResolvedValue(createMockFetchResponse(aiResponse))
    mockComposio.tools.execute.mockResolvedValue({ successful: true, data: { id: 456 } })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result.success).toBe(true)
    expect(result.action_used).toBe('GITHUB_CREATE_ISSUE')
    expect(result.inputs_used).toEqual({
      owner: 'org',
      repo: 'myrepo',
      title: 'Bug',
    })
  })

  it('passes correct params to composio.tools.execute()', async () => {
    const aiResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'test-org', repo: 'test-repo', title: 'Test Issue' },
    })

    mockFetch.mockResolvedValue(createMockFetchResponse(aiResponse))
    mockComposio.tools.execute.mockResolvedValue({ successful: true, data: { id: 789 } })

    await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(mockComposio.tools.execute).toHaveBeenCalledWith('GITHUB_CREATE_ISSUE', {
      connectedAccountId: 'conn_123',
      arguments: {
        owner: 'test-org',
        repo: 'test-repo',
        title: 'Test Issue',
      },
    })
  })

  it('returns success with action_used and inputs_used', async () => {
    const aiResponse = JSON.stringify({
      actionName: 'GITHUB_LIST_REPOS',
      inputs: { username: 'octocat' },
    })

    mockFetch.mockResolvedValue(createMockFetchResponse(aiResponse))
    mockComposio.tools.execute.mockResolvedValue({
      successful: true,
      data: [{ name: 'repo1' }, { name: 'repo2' }],
    })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: true,
      action_used: 'GITHUB_LIST_REPOS',
      inputs_used: { username: 'octocat' },
      result: [{ name: 'repo1' }, { name: 'repo2' }],
    })
  })

  it('returns error when KIRO_CHAT_URL is missing', async () => {
    vi.stubEnv('KIRO_CHAT_URL', '')

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: false,
      error: 'Missing KIRO_CHAT_URL or KIRO_CHAT_AUTH_TOKEN environment variables',
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns error when KIRO_CHAT_AUTH_TOKEN is missing', async () => {
    vi.stubEnv('KIRO_CHAT_AUTH_TOKEN', '')

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: false,
      error: 'Missing KIRO_CHAT_URL or KIRO_CHAT_AUTH_TOKEN environment variables',
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns error when no actions available for app', async () => {
    const { getAppActions } = vi.mocked(await import('../actions/get-app-actions'))
    getAppActions.mockResolvedValue([])

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: false,
      error: 'No actions available for app: github',
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns error when AI returns invalid JSON', async () => {
    const aiResponse = "I'll create an issue for you right away!"

    mockFetch.mockResolvedValue(createMockFetchResponse(aiResponse))

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result.success).toBe(false)
    expect(result.error).toContain('AI returned invalid JSON')
    expect(result.error).toContain("I'll create an issue")
  })

  it('returns error when AI returns JSON without actionName', async () => {
    const aiResponse = JSON.stringify({
      inputs: { owner: 'org', title: 'Test' },
    })

    mockFetch.mockResolvedValue(createMockFetchResponse(aiResponse))

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: false,
      error: 'AI response missing actionName field',
    })
  })

  it('returns error when AI selects unknown action', async () => {
    const aiResponse = JSON.stringify({
      actionName: 'GITHUB_DELETE_UNIVERSE',
      inputs: {},
    })

    mockFetch.mockResolvedValue(createMockFetchResponse(aiResponse))

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: false,
      error: 'AI selected unknown action: GITHUB_DELETE_UNIVERSE',
    })
    expect(mockComposio.tools.execute).not.toHaveBeenCalled()
  })

  it('includes workflow context in prompt when provided', async () => {
    const context = {
      previousStepOutput: { issueNumber: 42 },
      triggerId: 'webhook-123',
    }

    const aiResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug' },
    })

    mockFetch.mockResolvedValue(createMockFetchResponse(aiResponse))
    mockComposio.tools.execute.mockResolvedValue({ successful: true, data: {} })

    await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId, context)

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    const userPrompt = callBody.messages[1].content

    expect(userPrompt).toContain('Workflow context from previous steps')
    expect(userPrompt).toContain('"previousStepOutput"')
    expect(userPrompt).toContain('"issueNumber": 42')
    expect(userPrompt).toContain('"triggerId": "webhook-123"')
  })

  it('handles API timeout', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted')
            error.name = 'AbortError'
            reject(error)
          }, 100)
        })
    )

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: false,
      error: 'AI request timed out after 30 seconds',
    })
  })

  it('returns error when API request fails with non-ok status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: false,
      error: 'AI request failed with status 500: Internal Server Error',
    })
  })

  it('returns error when AI API returns invalid response format', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        // Missing choices array
        model: 'kiro',
      }),
    })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: false,
      error: 'Invalid response format from AI API',
    })
  })

  it('returns error when composio action execution fails', async () => {
    const aiResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug' },
    })

    mockFetch.mockResolvedValue(createMockFetchResponse(aiResponse))
    mockComposio.tools.execute.mockResolvedValue({
      successful: false,
      error: 'Repository not found',
    })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: false,
      action_used: 'GITHUB_CREATE_ISSUE',
      inputs_used: { owner: 'org', repo: 'repo', title: 'Bug' },
      error: 'Repository not found',
    })
  })

  it('handles generic errors during execution', async () => {
    const { getAppActions } = vi.mocked(await import('../actions/get-app-actions'))
    getAppActions.mockRejectedValue(new Error('Network failure'))

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: false,
      error: 'Network failure',
    })
  })

  it('handles unknown errors during execution', async () => {
    const { getAppActions } = vi.mocked(await import('../actions/get-app-actions'))
    getAppActions.mockRejectedValue('String error')

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result).toEqual({
      success: false,
      error: 'Unknown error during AI-powered app execution',
    })
  })

  it('handles AI response with empty inputs object', async () => {
    const aiResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: {},
    })

    mockFetch.mockResolvedValue(createMockFetchResponse(aiResponse))
    mockComposio.tools.execute.mockResolvedValue({ successful: true, data: { id: 999 } })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result.success).toBe(true)
    expect(mockComposio.tools.execute).toHaveBeenCalledWith('GITHUB_CREATE_ISSUE', {
      connectedAccountId: 'conn_123',
      arguments: {},
    })
  })

  it('handles AI response without inputs field', async () => {
    const aiResponse = JSON.stringify({
      actionName: 'GITHUB_LIST_REPOS',
    })

    mockFetch.mockResolvedValue(createMockFetchResponse(aiResponse))
    mockComposio.tools.execute.mockResolvedValue({ successful: true, data: [] })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result.success).toBe(true)
    expect(mockComposio.tools.execute).toHaveBeenCalledWith('GITHUB_LIST_REPOS', {
      connectedAccountId: 'conn_123',
      arguments: {},
    })
  })

  // --- Retry loop tests ---

  it('retries with AI-corrected inputs on first failure and succeeds', async () => {
    const initialResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug', labels: 'bug' },
    })
    const correctedResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug', labels: ['bug'] },
    })

    // First fetch = initial AI call, second fetch = retry AI call
    mockFetch
      .mockResolvedValueOnce(createMockFetchResponse(initialResponse))
      .mockResolvedValueOnce(createMockFetchResponse(correctedResponse))

    // First Composio call fails, second succeeds
    mockComposio.tools.execute
      .mockResolvedValueOnce({
        successful: false,
        error: 'Input should be a valid list on parameter labels',
      })
      .mockResolvedValueOnce({ successful: true, data: { id: 42 } })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result.success).toBe(true)
    expect(result.action_used).toBe('GITHUB_CREATE_ISSUE')
    expect(result.inputs_used).toEqual({
      owner: 'org',
      repo: 'repo',
      title: 'Bug',
      labels: ['bug'],
    })
    expect(result.result).toEqual({ id: 42 })
    expect(mockComposio.tools.execute).toHaveBeenCalledTimes(2)
  })

  it('sends error context to AI in retry prompt', async () => {
    const initialResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug', labels: 'bug' },
    })
    const correctedResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug', labels: ['bug'] },
    })

    mockFetch
      .mockResolvedValueOnce(createMockFetchResponse(initialResponse))
      .mockResolvedValueOnce(createMockFetchResponse(correctedResponse))

    mockComposio.tools.execute
      .mockResolvedValueOnce({
        successful: false,
        error: 'Input should be a valid list on parameter labels',
      })
      .mockResolvedValueOnce({ successful: true, data: {} })

    await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    // Verify the retry fetch call includes error context
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const retryBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(retryBody.messages).toHaveLength(4)
    expect(retryBody.messages[2].role).toBe('assistant')
    expect(retryBody.messages[2].content).toContain('GITHUB_CREATE_ISSUE')
    expect(retryBody.messages[3].role).toBe('user')
    expect(retryBody.messages[3].content).toContain(
      'Input should be a valid list on parameter labels'
    )
    expect(retryBody.messages[3].content).toContain('fix the inputs')
  })

  it('exhausts all retry attempts and returns final error', async () => {
    const sameResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug' },
    })

    // All fetch calls return same response
    mockFetch.mockResolvedValue(createMockFetchResponse(sameResponse))

    // All Composio calls fail
    mockComposio.tools.execute.mockResolvedValue({
      successful: false,
      error: 'Persistent failure',
    })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Persistent failure')
    expect(result.action_used).toBe('GITHUB_CREATE_ISSUE')
    // 3 Composio attempts total (initial + 2 retries)
    expect(mockComposio.tools.execute).toHaveBeenCalledTimes(3)
    // 3 fetch calls: initial + 2 retry AI calls
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('stops retrying when retry AI call returns non-ok response', async () => {
    const initialResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug' },
    })

    mockFetch
      .mockResolvedValueOnce(createMockFetchResponse(initialResponse))
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Server Error' })

    mockComposio.tools.execute.mockResolvedValueOnce({
      successful: false,
      error: 'Bad input',
    })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Bad input')
    // Only 1 Composio call — stopped after retry AI failed
    expect(mockComposio.tools.execute).toHaveBeenCalledTimes(1)
  })

  it('stops retrying when retry AI returns invalid JSON', async () => {
    const initialResponse = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug' },
    })

    mockFetch
      .mockResolvedValueOnce(createMockFetchResponse(initialResponse))
      .mockResolvedValueOnce(createMockFetchResponse("Sorry, I can't fix that. Let me try again."))

    mockComposio.tools.execute.mockResolvedValueOnce({
      successful: false,
      error: 'Invalid parameters',
    })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid parameters')
    expect(mockComposio.tools.execute).toHaveBeenCalledTimes(1)
  })

  it('succeeds on third attempt after two failures', async () => {
    const attempt1 = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug', labels: 'bug' },
    })
    const attempt2 = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug', labels: ['bug'], assignees: 'me' },
    })
    const attempt3 = JSON.stringify({
      actionName: 'GITHUB_CREATE_ISSUE',
      inputs: { owner: 'org', repo: 'repo', title: 'Bug', labels: ['bug'], assignees: ['me'] },
    })

    mockFetch
      .mockResolvedValueOnce(createMockFetchResponse(attempt1))
      .mockResolvedValueOnce(createMockFetchResponse(attempt2))
      .mockResolvedValueOnce(createMockFetchResponse(attempt3))

    mockComposio.tools.execute
      .mockResolvedValueOnce({ successful: false, error: 'labels must be array' })
      .mockResolvedValueOnce({ successful: false, error: 'assignees must be array' })
      .mockResolvedValueOnce({ successful: true, data: { id: 99 } })

    const result = await executeAppStepWithAI(mockAppId, mockInstructions, mockConnectionId)

    expect(result.success).toBe(true)
    expect(result.inputs_used).toEqual({
      owner: 'org',
      repo: 'repo',
      title: 'Bug',
      labels: ['bug'],
      assignees: ['me'],
    })
    expect(mockComposio.tools.execute).toHaveBeenCalledTimes(3)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})
