'use client'

import type { UIMessage } from 'ai'
import { isTextUIPart, isReasoningUIPart, isToolUIPart } from 'ai'
import BoringAvatar from 'boring-avatars'
import {
  ArrowUpIcon,
  CopyIcon,
  FileIcon,
  SquareIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning'
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useInvalidateAgentWorkflows } from '@/hooks/use-agent-workflows'
import { useMessageFeedback } from '@/hooks/use-message-feedback'
import { cn } from '@/lib/utils'
import { getAgentPalette } from '@/lib/agent-palettes'

// Module-level callback for cross-component new chat trigger (no useEffect needed)
const _newChatState: { handler: (() => void) | null } = { handler: null }
export function triggerNewChat() {
  _newChatState.handler?.()
}

interface ChatPanelProps {
  agentId: string
  agentName: string
  agentPalette: string
  conversationStarters: string[]
  coworkers?: { id: string; name: string }[]
  currentUserId: string
  initialConversationId: string | null
  initialMessages: {
    id: string
    role: string
    content: string
    sender_id: string | null
    sender_name: string | null
    sender_avatar: string | null
  }[]
  initialQuery?: string
}

function AgentAvatar({
  name,
  palette,
  size = 28,
}: {
  name: string
  palette: string
  size?: number
}) {
  return (
    <BoringAvatar name={name} variant="bauhaus" size={size} colors={getAgentPalette(palette)} />
  )
}

/** Format a tool name for display (SCREAMING_SNAKE -> Title Case) */
function formatToolName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function ChatMessageItem({
  message,
  agentName,
  agentPalette,
  isStreaming,
  currentUserId,
  feedback,
  onFeedback,
}: {
  message: UIMessage
  agentName: string
  agentPalette: string
  isStreaming: boolean
  currentUserId: string
  feedback: 'like' | 'dislike' | null
  onFeedback: (messageId: string, feedback: 'like' | 'dislike') => void
}) {
  const isUser = message.role === 'user'

  // Extract sender info from message metadata
  const meta = message.metadata as Record<string, unknown> | undefined
  const senderId = meta?.senderId as string | undefined
  const senderName = meta?.senderName as string | undefined
  const senderAvatar = meta?.senderAvatar as string | undefined
  const isOwnMessage = !senderId || senderId === currentUserId

  // Separate parts by type using AI SDK type guards
  const parts = message.parts ?? []
  const textParts = parts.filter(isTextUIPart)
  const reasoningParts = parts.filter(isReasoningUIPart)
  // isToolUIPart catches both named tool parts (type: 'tool-${name}') and dynamic tool parts (type: 'dynamic-tool')
  const toolParts = parts.filter(isToolUIPart)
  const fileParts = parts.filter(
    (p): p is { type: 'file'; url: string; mediaType: string; filename?: string } =>
      p.type === 'file'
  )

  const textContent = textParts.map((p) => p.text).join('')

  // Consolidate reasoning parts into a single text block and detect streaming state
  const reasoningText = reasoningParts.map((part) => part.text).join('\n\n')
  const lastPart = parts.at(-1)
  const isReasoningStreaming = isStreaming && lastPart?.type === 'reasoning'

  // Other users' messages are displayed left-aligned (like assistant)
  const messageFrom = isUser && !isOwnMessage ? 'assistant' : message.role

  return (
    <Message from={messageFrom}>
      {/* Agent avatar for assistant messages */}
      {!isUser && (
        <div className="mb-1 flex items-center gap-2">
          <AgentAvatar name={agentName} palette={agentPalette} />
          <span className="text-muted-foreground text-sm font-medium">{agentName}</span>
        </div>
      )}

      {/* Other user's avatar and name for their messages */}
      {isUser && !isOwnMessage && (
        <div className="mb-1 flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarImage src={senderAvatar ?? undefined} />
            <AvatarFallback className="text-xs">
              {senderName?.[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground text-sm font-medium">
            {senderName ?? 'Membro da equipe'}
          </span>
        </div>
      )}

      <MessageContent>
        {isUser ? (
          <>
            {fileParts.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {fileParts.map((file, i) =>
                  file.mediaType.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={file.url}
                      alt={file.filename ?? 'Imagem anexada'}
                      className="max-h-48 max-w-64 rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      key={i}
                      className="bg-muted flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                    >
                      <FileIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span className="max-w-[200px] truncate">
                        {file.filename ?? 'Arquivo anexado'}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
            {textContent && <p className="whitespace-pre-wrap">{textContent}</p>}
          </>
        ) : (
          <>
            {/* Reasoning — only show when model actually produces reasoning parts */}
            {reasoningParts.length > 0 && (
              <Reasoning isStreaming={isReasoningStreaming}>
                <ReasoningTrigger />
                <ReasoningContent>{reasoningText}</ReasoningContent>
              </Reasoning>
            )}

            {/* Tool invocation parts */}
            {toolParts.map((part) => {
              const isDynamic = part.type === 'dynamic-tool'
              const toolName = isDynamic
                ? (part as { toolName: string }).toolName
                : part.type.replace(/^tool-/, '')

              return (
                <Tool key={part.toolCallId}>
                  {isDynamic ? (
                    <ToolHeader
                      type="dynamic-tool"
                      state={part.state}
                      toolName={toolName}
                      title={formatToolName(toolName)}
                    />
                  ) : (
                    <ToolHeader
                      type={part.type as `tool-${string}`}
                      state={part.state}
                      title={formatToolName(toolName)}
                    />
                  )}
                  <ToolContent>
                    {'input' in part && part.input ? <ToolInput input={part.input} /> : null}
                    {'output' in part || 'errorText' in part ? (
                      <ToolOutput
                        output={'output' in part ? part.output : undefined}
                        errorText={'errorText' in part ? part.errorText : undefined}
                      />
                    ) : null}
                  </ToolContent>
                </Tool>
              )
            })}

            {/* Text response with markdown */}
            {textContent && <MessageResponse>{textContent}</MessageResponse>}
          </>
        )}
      </MessageContent>

      {/* Actions for assistant messages */}
      {!isUser && textContent && !isStreaming && (
        <MessageActions>
          <MessageAction
            tooltip="Copiar"
            onClick={() => navigator.clipboard.writeText(textContent)}
          >
            <CopyIcon className="size-3.5" />
          </MessageAction>
          <MessageAction
            tooltip="Curtir"
            onClick={() => onFeedback(message.id, 'like')}
            className={cn(feedback === 'like' && 'text-green-600 dark:text-green-400')}
          >
            <ThumbsUpIcon className={cn('size-3.5', feedback === 'like' && 'fill-current')} />
          </MessageAction>
          <MessageAction
            tooltip="Não curtir"
            onClick={() => onFeedback(message.id, 'dislike')}
            className={cn(feedback === 'dislike' && 'text-red-600 dark:text-red-400')}
          >
            <ThumbsDownIcon className={cn('size-3.5', feedback === 'dislike' && 'fill-current')} />
          </MessageAction>
        </MessageActions>
      )}
    </Message>
  )
}

const VISIBLE_COWORKERS = 3

function AgentPills({ agents }: { agents: { id: string; name: string }[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const visible = agents.slice(0, VISIBLE_COWORKERS)
  const overflow = agents.length - VISIBLE_COWORKERS

  if (agents.length === 0) return null

  return (
    <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto">
      <button
        type="button"
        onClick={() => setSelected(null)}
        className={cn(
          'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
          selected === null
            ? 'bg-foreground text-background'
            : 'bg-background text-muted-foreground hover:text-foreground'
        )}
      >
        Todos
      </button>
      {visible.map((agent) => (
        <button
          key={agent.id}
          type="button"
          onClick={() => setSelected(selected === agent.id ? null : agent.id)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
            selected === agent.id
              ? 'bg-foreground text-background'
              : 'bg-background text-muted-foreground hover:text-foreground'
          )}
        >
          {agent.name}
        </button>
      ))}
      {overflow > 0 && (
        <span className="text-muted-foreground bg-background shrink-0 rounded-full px-2.5 py-1 text-xs">
          +{overflow}
        </span>
      )}
    </div>
  )
}

export default function ChatPanel({
  agentId,
  agentName,
  agentPalette,
  conversationStarters,
  coworkers = [],
  currentUserId,
  initialConversationId,
  initialMessages,
  initialQuery,
}: ChatPanelProps) {
  const invalidateWorkflows = useInvalidateAgentWorkflows(agentId)
  const { messages, status, isLoading, isStreaming, error, sendMessage, startNewChat, stop } =
    useAgentChat(agentId, currentUserId, {
      onSkillMutation: invalidateWorkflows,
      initialConversationId,
      initialMessages,
      initialQuery,
    })

  const hasMessages = messages.length > 0

  // Filter to visible messages (exclude tool/system messages from render)
  const visibleMessages = useMemo(
    () => messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
    [messages]
  )

  // Message feedback (like/dislike)
  const assistantMessageIds = useMemo(
    () => messages.filter((m) => m.role === 'assistant').map((m) => m.id),
    [messages]
  )
  const { getFeedback, toggleFeedback } = useMessageFeedback(agentId, assistantMessageIds)

  // Register handler so the header button can trigger new chat
  // (legitimate side effect: callback registration, not data syncing)
  useEffect(() => {
    _newChatState.handler = startNewChat
    return () => {
      _newChatState.handler = null
    }
  }, [startNewChat])

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      sendMessage(suggestion)
    },
    [sendMessage]
  )

  const handleSubmit = useCallback(
    (msg: PromptInputMessage) => {
      if (msg.text.trim() || msg.files.length > 0) {
        sendMessage(msg.text.trim(), msg.files.length > 0 ? msg.files : undefined)
      }
    },
    [sendMessage]
  )

  // Find the last assistant message to know which one is streaming
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return null
  }, [messages])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-2xl">
          {!hasMessages ? (
            <ConversationEmptyState>
              <AgentAvatar name={agentName} palette={agentPalette} size={72} />
              <h2 className="text-foreground mt-6 text-xl font-semibold">{agentName}</h2>
              <p className="text-muted-foreground mt-1 max-w-md text-center text-sm leading-relaxed">
                Faça uma pergunta ou escolha uma sugestão abaixo.
              </p>
              {conversationStarters.length > 0 && (
                <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-3">
                  {conversationStarters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => handleSuggestionClick(starter)}
                      className="border-border hover:bg-muted/50 rounded-xl border p-4 text-left transition-colors"
                    >
                      <p className="text-foreground text-sm leading-snug">{starter}</p>
                    </button>
                  ))}
                </div>
              )}
            </ConversationEmptyState>
          ) : (
            visibleMessages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                agentName={agentName}
                agentPalette={agentPalette}
                isStreaming={isStreaming && message.id === lastAssistantId}
                currentUserId={currentUserId}
                feedback={getFeedback(message.id)}
                onFeedback={toggleFeedback}
              />
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Error banner */}
      {error && (
        <div className="border-destructive/20 bg-destructive/10 text-destructive mx-4 mb-2 rounded-lg border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Prompt input area — matches reference installed agent layout */}
      <div className="bg-background sticky bottom-0 px-4 py-4">
        <div className="[&_[data-slot=input-group]]:border-border [&_[data-slot=input-group]]:bg-muted/40 mx-auto max-w-2xl [&_[data-slot=input-group]]:rounded-2xl [&_[data-slot=input-group]]:shadow-none">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea placeholder={`Message ${agentName}...`} disabled={isLoading} />
            <PromptInputFooter>
              <div className="flex-1" />
              <PromptInputSubmit
                status={status}
                onStop={stop}
                variant="outline"
                size="icon-sm"
                className="border-border h-8 w-8 rounded-full border"
              >
                {status === 'streaming' ? (
                  <SquareIcon className="size-4" />
                ) : (
                  <ArrowUpIcon className="size-4" />
                )}
              </PromptInputSubmit>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  )
}
