import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const mockSendMessage = vi.fn()
const mockSetMessages = vi.fn()
const mockStop = vi.fn()
const mockUseChat = vi.fn(() => ({
  messages: [],
  status: 'ready',
  error: null,
  sendMessage: mockSendMessage,
  setMessages: mockSetMessages,
  stop: mockStop,
}))

vi.mock('@ai-sdk/react', () => ({
  useChat: mockUseChat,
}))

const MockDefaultChatTransport = vi.fn().mockImplementation(function (
  this: Record<string, unknown>,
  config: Record<string, unknown>
) {
  this.config = config
})

vi.mock('ai', () => ({
  DefaultChatTransport: MockDefaultChatTransport,
  isToolUIPart: vi.fn(() => false),
  isTextUIPart: vi.fn(() => false),
  isReasoningUIPart: vi.fn(() => false),
}))

const mockLoadConversationHistory = vi.fn()

vi.mock('@/lib/actions/agent-conversations', () => ({
  loadConversationHistory: mockLoadConversationHistory,
}))

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}
const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => mockSupabase),
}))

describe('useAgentChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    MockDefaultChatTransport.mockClear()
    mockLoadConversationHistory.mockResolvedValue(null)
    mockUseChat.mockReturnValue({
      messages: [],
      status: 'ready',
      error: null,
      sendMessage: mockSendMessage,
      setMessages: mockSetMessages,
      stop: mockStop,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns expected initial state', async () => {
    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.isLoadingHistory).toBe(true)
    expect(result.current.error).toBe(null)
    expect(result.current.conversationId).toBe(null)

    await waitFor(() => {
      expect(result.current.isLoadingHistory).toBe(false)
    })
  })

  it('creates transport with correct API URL', async () => {
    const { useAgentChat } = await import('../use-agent-chat')

    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

    expect(MockDefaultChatTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        api: '/api/agents/agent-123/chat',
      })
    )

    await waitFor(() => {
      expect(result.current.isLoadingHistory).toBe(false)
    })
  })

  it('loads conversation history on mount', async () => {
    const { useAgentChat } = await import('../use-agent-chat')
    renderHook(() => useAgentChat('agent-123', 'user-1'))

    await waitFor(() => {
      expect(mockLoadConversationHistory).toHaveBeenCalledWith('agent-123')
    })
  })

  it('sets messages from loaded history', async () => {
    const mockHistory = {
      conversationId: 'conv-123',
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hello' },
        { id: 'msg-2', role: 'assistant', content: 'Hi there!' },
        { id: 'msg-3', role: 'system', content: 'System message' },
      ],
    }

    mockLoadConversationHistory.mockResolvedValue(mockHistory)

    const { useAgentChat } = await import('../use-agent-chat')
    renderHook(() => useAgentChat('agent-123', 'user-1'))

    await waitFor(() => {
      expect(mockSetMessages).toHaveBeenCalledWith([
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
        {
          id: 'msg-2',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hi there!' }],
        },
      ])
    })
  })

  it('handles missing conversation history', async () => {
    mockLoadConversationHistory.mockResolvedValue(null)

    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

    await waitFor(() => {
      expect(result.current.isLoadingHistory).toBe(false)
    })

    expect(mockSetMessages).not.toHaveBeenCalled()
    expect(result.current.conversationId).toBe(null)
  })

  it('handles history load error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('Failed to load')
    mockLoadConversationHistory.mockRejectedValue(error)

    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

    await waitFor(() => {
      expect(result.current.isLoadingHistory).toBe(false)
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load conversation history:', error)
    consoleErrorSpy.mockRestore()
  })

  it('isStreaming derives from status', async () => {
    mockUseChat.mockReturnValue({
      messages: [],
      status: 'streaming',
      error: null,
      sendMessage: mockSendMessage,
      setMessages: mockSetMessages,
      stop: mockStop,
    })

    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

    expect(result.current.isStreaming).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoadingHistory).toBe(false)
    })
  })

  it('isLoading derives from status - submitted', async () => {
    mockUseChat.mockReturnValue({
      messages: [],
      status: 'submitted',
      error: null,
      sendMessage: mockSendMessage,
      setMessages: mockSetMessages,
      stop: mockStop,
    })

    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoadingHistory).toBe(false)
    })
  })

  it('isLoading derives from status - streaming', async () => {
    mockUseChat.mockReturnValue({
      messages: [],
      status: 'streaming',
      error: null,
      sendMessage: mockSendMessage,
      setMessages: mockSetMessages,
      stop: mockStop,
    })

    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isStreaming).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoadingHistory).toBe(false)
    })
  })

  it('sendMessage delegates to aiSendMessage', async () => {
    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

    await waitFor(() => {
      expect(result.current.isLoadingHistory).toBe(false)
    })

    await act(async () => {
      await result.current.sendMessage('hello')
    })

    expect(mockSendMessage).toHaveBeenCalledWith({ text: 'hello' })
  })

  it('error extracts message from chatError', async () => {
    mockUseChat.mockReturnValue({
      messages: [],
      status: 'ready',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: new Error('Network error') as any,
      sendMessage: mockSendMessage,
      setMessages: mockSetMessages,
      stop: mockStop,
    })

    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

    expect(result.current.error).toBe('Network error')

    await waitFor(() => {
      expect(result.current.isLoadingHistory).toBe(false)
    })
  })

  it('error is null when chatError is null', async () => {
    mockUseChat.mockReturnValue({
      messages: [],
      status: 'ready',
      error: null,
      sendMessage: mockSendMessage,
      setMessages: mockSetMessages,
      stop: mockStop,
    })

    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

    expect(result.current.error).toBe(null)

    await waitFor(() => {
      expect(result.current.isLoadingHistory).toBe(false)
    })
  })
})
