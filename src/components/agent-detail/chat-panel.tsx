'use client'

import type { UIMessage } from 'ai'
import { isTextUIPart, isReasoningUIPart, isToolUIPart } from 'ai'
import BoringAvatar from 'boring-avatars'
import { CopyIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react'
import { useCallback } from 'react'

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
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion'
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool'
// SaveSkillDialog removed - skills are now created via chat tool calling
import { Button } from '@/components/ui/button'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useInvalidateAgentSkills } from '@/hooks/use-agent-skills'
import { getAgentPalette } from '@/lib/agent-palettes'

interface ChatPanelProps {
  agentId: string
  agentName: string
  agentPalette: string
  conversationStarters: string[]
}

function AgentAvatar({ name, palette }: { name: string; palette: string }) {
  return <BoringAvatar name={name} variant="bauhaus" size={28} colors={getAgentPalette(palette)} />
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
  agentId,
  isStreaming,
}: {
  message: UIMessage
  agentName: string
  agentPalette: string
  agentId: string
  isStreaming: boolean
}) {
  const isUser = message.role === 'user'

  // Separate parts by type using AI SDK type guards
  const parts = message.parts ?? []
  const textParts = parts.filter(isTextUIPart)
  const reasoningParts = parts.filter(isReasoningUIPart)
  // isToolUIPart catches both named tool parts (type: 'tool-${name}') and dynamic tool parts (type: 'dynamic-tool')
  const toolParts = parts.filter(isToolUIPart)

  const textContent = textParts.map((p) => p.text).join('')

  // Check if tool executions succeeded (for "Save as skill" button)
  const completedTools = toolParts.filter((p) => p.state === 'output-available')
  const hasCompletedTools = completedTools.length > 0

  return (
    <Message from={message.role}>
      {/* Agent avatar for assistant messages */}
      {!isUser && (
        <div className="mb-1 flex items-center gap-2">
          <AgentAvatar name={agentName} palette={agentPalette} />
          <span className="text-muted-foreground text-sm font-medium">{agentName}</span>
        </div>
      )}

      <MessageContent>
        {isUser ? (
          <p className="whitespace-pre-wrap">{textContent}</p>
        ) : (
          <>
            {/* Reasoning parts */}
            {reasoningParts.map((part, i) => (
              <Reasoning
                key={`reasoning-${i}`}
                isStreaming={isStreaming && i === reasoningParts.length - 1}
              >
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            ))}

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

            {/* Streaming indicator when no text yet */}
            {isStreaming && !textContent && toolParts.length === 0 && (
              <Shimmer as="p">Thinking...</Shimmer>
            )}
          </>
        )}
      </MessageContent>

      {/* Actions for assistant messages */}
      {!isUser && textContent && !isStreaming && (
        <MessageActions>
          <MessageAction tooltip="Copy" onClick={() => navigator.clipboard.writeText(textContent)}>
            <CopyIcon className="size-3.5" />
          </MessageAction>
          <MessageAction tooltip="Like">
            <ThumbsUpIcon className="size-3.5" />
          </MessageAction>
          <MessageAction tooltip="Dislike">
            <ThumbsDownIcon className="size-3.5" />
          </MessageAction>

          {/* Skills are now created via chat tool calling (SNEW_CREATE_SKILL) */}
        </MessageActions>
      )}
    </Message>
  )
}

export default function ChatPanel({
  agentId,
  agentName,
  agentPalette,
  conversationStarters,
}: ChatPanelProps) {
  const invalidateSkills = useInvalidateAgentSkills(agentId)
  const { messages, status, isLoading, isStreaming, isLoadingHistory, error, sendMessage, stop } =
    useAgentChat(agentId, { onSkillMutation: invalidateSkills })

  const hasMessages = messages.length > 0

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      sendMessage(suggestion)
    },
    [sendMessage]
  )

  const handleSubmit = useCallback(
    (msg: PromptInputMessage) => {
      if (msg.text.trim()) {
        sendMessage(msg.text.trim())
      }
    },
    [sendMessage]
  )

  // Find the last assistant message to know which one is streaming
  const lastAssistantIndex = [...messages].reverse().findIndex((m) => m.role === 'assistant')
  const lastAssistantId =
    lastAssistantIndex >= 0 ? messages[messages.length - 1 - lastAssistantIndex]?.id : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Loading history skeleton */}
      {isLoadingHistory ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="w-full max-w-2xl space-y-4">
            <div className="bg-muted h-16 animate-pulse rounded-2xl" />
            <div className="bg-muted h-12 animate-pulse rounded-2xl" />
            <div className="bg-muted h-20 animate-pulse rounded-2xl" />
          </div>
        </div>
      ) : (
        <Conversation className="flex-1">
          <ConversationContent className="mx-auto max-w-3xl">
            {!hasMessages ? (
              <ConversationEmptyState
                title={`Chat with ${agentName}`}
                description="Ask a question or pick a conversation starter below."
              />
            ) : (
              messages
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .map((message) => (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    agentName={agentName}
                    agentPalette={agentPalette}
                    agentId={agentId}
                    isStreaming={isStreaming && message.id === lastAssistantId}
                  />
                ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      {/* Error banner */}
      {error && (
        <div className="border-destructive/20 bg-destructive/10 text-destructive mx-4 mb-2 rounded-lg border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Prompt input area */}
      <div className="bg-background border-t px-4 py-3">
        <div className="mx-auto max-w-3xl">
          {/* Suggestion chips when no messages */}
          {!hasMessages && conversationStarters.length > 0 && (
            <div className="mb-3">
              <Suggestions>
                {conversationStarters.map((starter) => (
                  <Suggestion key={starter} suggestion={starter} onClick={handleSuggestionClick} />
                ))}
              </Suggestions>
            </div>
          )}

          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea placeholder={`Chat with ${agentName}...`} disabled={isLoading} />
            <PromptInputFooter>
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  )
}
