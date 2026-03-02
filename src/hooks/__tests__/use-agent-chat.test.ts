import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

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

vi.mock('@/lib/actions/agent-conversations', () => ({
  loadConversationHistory: vi.fn(),
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

  it('returns expected initial state without server data', async () => {
    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.conversationId).toBe(null)
  })

  it('creates transport with correct API URL', async () => {
    const { useAgentChat } = await import('../use-agent-chat')
    renderHook(() => useAgentChat('agent-123', 'user-1'))

    expect(MockDefaultChatTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        api: '/api/agents/agent-123/chat',
      })
    )
  })

  it('passes server-provided initialMessages to useChat', async () => {
    const serverMessages = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        sender_id: 'user-1',
        sender_name: 'Alice',
        sender_avatar: null,
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        sender_id: null,
        sender_name: null,
        sender_avatar: null,
      },
      {
        id: 'msg-3',
        role: 'system',
        content: 'System message',
        sender_id: null,
        sender_name: null,
        sender_avatar: null,
      },
    ]

    const { useAgentChat } = await import('../use-agent-chat')
    renderHook(() =>
      useAgentChat('agent-123', 'user-1', {
        initialConversationId: 'conv-123',
        initialMessages: serverMessages,
      })
    )

    // useChat should be called with transformed initialMessages (system messages filtered out)
    expect(mockUseChat).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
            metadata: {
              senderId: 'user-1',
              senderName: 'Alice',
              senderAvatar: null,
            },
          },
          {
            id: 'msg-2',
            role: 'assistant',
            parts: [{ type: 'text', text: 'Hi there!' }],
            metadata: undefined,
          },
        ],
      })
    )
  })

  it('initializes conversationId from server data', async () => {
    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() =>
      useAgentChat('agent-123', 'user-1', {
        initialConversationId: 'conv-456',
        initialMessages: [],
      })
    )

    expect(result.current.conversationId).toBe('conv-456')
  })

  it('handles empty initialMessages', async () => {
    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() =>
      useAgentChat('agent-123', 'user-1', {
        initialConversationId: null,
        initialMessages: [],
      })
    )

    expect(result.current.conversationId).toBe(null)
    expect(mockUseChat).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: undefined,
      })
    )
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
  })

  it('sendMessage delegates to aiSendMessage', async () => {
    const { useAgentChat } = await import('../use-agent-chat')
    const { result } = renderHook(() => useAgentChat('agent-123', 'user-1'))

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
  })
})
