/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatPanel from '../chat-panel'
import { useAgentChat } from '@/hooks/use-agent-chat'

// Mock AI Elements with simple div wrappers
vi.mock('@/components/ai-elements/conversation', () => ({
  Conversation: ({ children, ...props }: any) => (
    <div data-testid="conversation" {...props}>
      {children}
    </div>
  ),
  ConversationContent: ({ children, ...props }: any) => (
    <div data-testid="conversation-content" {...props}>
      {children}
    </div>
  ),
  ConversationEmptyState: ({ children }: any) => <div data-testid="empty-state">{children}</div>,
  ConversationScrollButton: () => <div data-testid="scroll-button" />,
}))

vi.mock('@/components/ai-elements/message', () => ({
  Message: ({ children, ...props }: any) => (
    <div data-testid="message" {...props}>
      {children}
    </div>
  ),
  MessageContent: ({ children }: any) => <div data-testid="message-content">{children}</div>,
  MessageResponse: ({ children }: any) => <div data-testid="message-response">{children}</div>,
  MessageActions: ({ children }: any) => <div data-testid="message-actions">{children}</div>,
  MessageAction: ({ children, ...props }: any) => (
    <div data-testid="message-action" {...props}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/ai-elements/prompt-input', () => ({
  PromptInput: ({ children }: any) => <div data-testid="prompt-input">{children}</div>,
  PromptInputTextarea: ({ placeholder, ...props }: any) => (
    <input data-testid="prompt-input-textarea" placeholder={placeholder} {...props} />
  ),
  PromptInputHeader: ({ children }: any) => <div data-testid="prompt-input-header">{children}</div>,
  PromptInputFooter: ({ children }: any) => <div data-testid="prompt-input-footer">{children}</div>,
  PromptInputTools: ({ children }: any) => <div data-testid="prompt-input-tools">{children}</div>,
  PromptInputButton: ({ children, ...props }: any) => (
    <button data-testid="prompt-input-button" {...props}>
      {children}
    </button>
  ),
  PromptInputSubmit: (props: any) => <button data-testid="prompt-input-submit" {...props} />,
  usePromptInputAttachments: () => ({ files: [], openFileDialog: vi.fn() }),
}))

vi.mock('@/components/ai-elements/reasoning', () => ({
  Reasoning: ({ children }: any) => <div data-testid="reasoning">{children}</div>,
  ReasoningTrigger: () => <div data-testid="reasoning-trigger" />,
  ReasoningContent: ({ children }: any) => <div data-testid="reasoning-content">{children}</div>,
}))

// Shimmer is no longer directly used — Reasoning component handles the working indicator

vi.mock('@/components/ai-elements/suggestion', () => ({
  Suggestion: ({ suggestion, ...props }: any) => (
    <div data-testid="suggestion" {...props}>
      {suggestion}
    </div>
  ),
  Suggestions: ({ children }: any) => <div data-testid="suggestions">{children}</div>,
}))

vi.mock('@/components/ai-elements/tool', () => ({
  Tool: ({ children, ...props }: any) => (
    <div data-testid="tool" {...props}>
      {children}
    </div>
  ),
  ToolHeader: ({ title, ...props }: any) => (
    <div data-testid="tool-header" {...props}>
      {title}
    </div>
  ),
  ToolContent: ({ children }: any) => <div data-testid="tool-content">{children}</div>,
  ToolInput: ({ input }: any) => <div data-testid="tool-input">{JSON.stringify(input)}</div>,
  ToolOutput: ({ children }: any) => <div data-testid="tool-output">{children}</div>,
}))

vi.mock('boring-avatars', () => ({
  default: ({ name }: any) => <div data-testid="avatar">{name}</div>,
}))

vi.mock('@/lib/agent-palettes', () => ({
  getAgentPalette: () => ['#000', '#111', '#222', '#333', '#444'],
}))

// SaveSkillDialog was removed — skills are created via conversational tool calling

vi.mock('ai', () => ({
  isTextUIPart: (p: any) => p.type === 'text',
  isReasoningUIPart: (p: any) => p.type === 'reasoning',
  isToolUIPart: (p: any) => p.type === 'dynamic-tool' || p.type?.startsWith?.('tool-'),
}))

vi.mock('@/hooks/use-agent-workflows', () => ({
  useInvalidateAgentWorkflows: () => vi.fn(),
}))

vi.mock('@/hooks/use-agent-chat', () => ({
  useAgentChat: vi.fn(),
}))

vi.mock('@/hooks/use-message-feedback', () => ({
  useMessageFeedback: () => ({
    getFeedback: () => null,
    toggleFeedback: vi.fn(),
  }),
}))

const mockUseAgentChat = useAgentChat as ReturnType<typeof vi.fn>

const defaultProps = {
  agentId: 'agent-1',
  agentName: 'Test Agent',
  agentPalette: 'blue',
  conversationStarters: ['Hello', 'Help me'],
  currentUserId: 'user-1',
  initialConversationId: null as string | null,
  initialMessages: [] as {
    id: string
    role: string
    content: string
    sender_id: string | null
    sender_name: string | null
    sender_avatar: string | null
  }[],
}

function mockChatState(overrides: Partial<ReturnType<typeof useAgentChat>> = {}) {
  mockUseAgentChat.mockReturnValue({
    messages: [],
    status: 'ready' as any,
    isLoading: false,
    isStreaming: false,
    error: null,
    conversationId: null,
    sendMessage: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  })
}

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty State', () => {
    it('should render empty state with agent name when no messages', () => {
      mockChatState()
      render(<ChatPanel {...defaultProps} />)

      const emptyState = screen.getByTestId('empty-state')
      expect(emptyState).toBeInTheDocument()
      expect(emptyState).toHaveTextContent('Test Agent')
    })

    it('should show conversation starters when no messages and starters provided', () => {
      mockChatState()
      render(<ChatPanel {...defaultProps} />)

      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('Help me')).toBeInTheDocument()
    })

    it('should not show starters when messages exist', () => {
      mockChatState({
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        ],
      })
      render(<ChatPanel {...defaultProps} />)

      // Starters are inside empty state which is hidden when messages exist
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })

    it('should not show empty state when messages exist', () => {
      mockChatState({
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        ],
      })
      render(<ChatPanel {...defaultProps} />)

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })
  })

  describe('Message Rendering', () => {
    it('should render user messages with text content', () => {
      mockChatState({
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            parts: [{ type: 'text', text: 'Hello world' }],
          },
        ],
      })
      render(<ChatPanel {...defaultProps} />)

      expect(screen.getByTestId('message')).toBeInTheDocument()
      expect(screen.getByText('Hello world')).toBeInTheDocument()
    })

    it('should render assistant messages with avatar, name, and response', () => {
      mockChatState({
        messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            parts: [{ type: 'text', text: 'Hi there!' }],
          },
        ],
      })
      render(<ChatPanel {...defaultProps} />)

      expect(screen.getByTestId('avatar')).toBeInTheDocument()
      expect(screen.getAllByText('Test Agent').length).toBeGreaterThan(0)
      expect(screen.getByTestId('message-response')).toBeInTheDocument()
    })

    it('should render multiple messages in correct order', () => {
      mockChatState({
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            parts: [{ type: 'text', text: 'First' }],
          },
          {
            id: 'msg-2',
            role: 'assistant',
            parts: [{ type: 'text', text: 'Second' }],
          },
          {
            id: 'msg-3',
            role: 'user',
            parts: [{ type: 'text', text: 'Third' }],
          },
        ],
      })
      render(<ChatPanel {...defaultProps} />)

      const messages = screen.getAllByTestId('message')
      expect(messages).toHaveLength(3)
    })

    it('should render reasoning parts in assistant messages', () => {
      mockChatState({
        messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            parts: [
              { type: 'reasoning', text: 'Thinking...' },
              { type: 'text', text: 'Answer' },
            ],
          },
        ],
      })
      render(<ChatPanel {...defaultProps} />)

      expect(screen.getByTestId('reasoning')).toBeInTheDocument()
      expect(screen.getByText('Thinking...')).toBeInTheDocument()
    })

    it('should render tool call parts in assistant messages', () => {
      mockChatState({
        messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            parts: [
              {
                type: 'tool-search',
                toolCallId: 'call-1',
                state: 'output-available' as const,
                input: { query: 'test' },
                output: null,
              } as any,
            ],
          },
        ],
      })
      render(<ChatPanel {...defaultProps} />)

      expect(screen.getByTestId('tool')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should show error banner when error is present', () => {
      mockChatState({
        error: 'Something went wrong' as any,
      })
      render(<ChatPanel {...defaultProps} />)

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should not show error banner when no error', () => {
      mockChatState({ error: null })
      render(<ChatPanel {...defaultProps} />)

      const errorText = screen.queryByText(/went wrong/i)
      expect(errorText).not.toBeInTheDocument()
    })
  })

  describe('Prompt Input', () => {
    it('should render prompt input with correct placeholder', () => {
      mockChatState()
      render(<ChatPanel {...defaultProps} />)

      const promptInput = screen.getByTestId('prompt-input-textarea')
      expect(promptInput).toBeInTheDocument()
      expect(promptInput).toHaveAttribute('placeholder', 'Message Test Agent...')
    })
  })

  describe('Streaming Indicator', () => {
    it('should not show reasoning indicator when streaming with no reasoning parts', () => {
      mockChatState({
        isStreaming: true,
        messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            parts: [], // No content yet — reasoning only shows when model produces reasoning parts
          },
        ],
      })
      render(<ChatPanel {...defaultProps} />)

      expect(screen.queryByTestId('reasoning')).not.toBeInTheDocument()
    })

    it('should not show reasoning indicator when streaming with tool parts but no reasoning', () => {
      mockChatState({
        isStreaming: true,
        messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            parts: [
              {
                type: 'tool-search',
                toolCallId: 'call-1',
                state: 'input-available' as const,
                input: { query: 'test' },
              } as any,
            ],
          },
        ],
      })
      render(<ChatPanel {...defaultProps} />)

      expect(screen.queryByTestId('reasoning')).not.toBeInTheDocument()
      expect(screen.getByTestId('tool')).toBeInTheDocument()
    })

    it('should not show reasoning indicator when streaming but has text content', () => {
      mockChatState({
        isStreaming: true,
        messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            parts: [{ type: 'text', text: 'Some text' }],
          },
        ],
      })
      render(<ChatPanel {...defaultProps} />)

      // The reasoning for model thinking is separate — the working indicator should not show
      expect(screen.queryByTestId('reasoning')).not.toBeInTheDocument()
    })

    it('should not show reasoning indicator when not streaming', () => {
      mockChatState({
        isStreaming: false,
        messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            parts: [],
          },
        ],
      })
      render(<ChatPanel {...defaultProps} />)

      expect(screen.queryByTestId('reasoning')).not.toBeInTheDocument()
    })
  })

  describe('Component Composition', () => {
    it('should render conversation scroll button', () => {
      mockChatState()
      render(<ChatPanel {...defaultProps} />)

      expect(screen.getByTestId('scroll-button')).toBeInTheDocument()
    })

    it('should render conversation wrapper', () => {
      mockChatState()
      render(<ChatPanel {...defaultProps} />)

      expect(screen.getByTestId('conversation')).toBeInTheDocument()
      expect(screen.getByTestId('conversation-content')).toBeInTheDocument()
    })
  })
})
