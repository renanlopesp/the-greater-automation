'use client'

import type { UIMessage } from 'ai'
import { isTextUIPart, isReasoningUIPart, isToolUIPart } from 'ai'
import { ArrowUpIcon, CopyIcon, SquareIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react'
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

import { useAgentChat } from '@/hooks/use-agent-chat'
import { useMessageFeedback } from '@/hooks/use-message-feedback'
import { parseOrchestratorResponse } from '@/lib/chat/parse-orchestrator-response'
import { cn } from '@/lib/utils'

import CoworkerSuggestionCard from './coworker-suggestion-card'
import FollowUpSuggestions from './follow-up-suggestions'
import ArtifactChip from './artifact-chip'
import ArtifactPanel from './artifact-panel'
import InstallWizardModal from '@/components/discover/install-wizard-modal'
import type { Artifact } from '@/types/artifacts'

// Module-level callback for cross-component new chat trigger
const _newChatState: { handler: (() => void) | null } = { handler: null }
export function triggerOrchestratorNewChat() {
  _newChatState.handler?.()
}

interface OrchestratorChatProps {
  orchestratorId: string
  currentUserId: string
  teamId: string
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

/** Format a tool name for display (SCREAMING_SNAKE -> Title Case) */
function formatToolName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const SUGGESTION_STARTERS = [
  'Quais carrinhos têm maior chance de conversão?',
  'Quanto vendi hoje?',
  'Quais clientes estão em risco de churn?',
  'Como estão meus co-workers?',
]

function OrchestratorMessageItem({
  message,
  isStreaming,
  isLastAssistant,
  currentUserId,
  feedback,
  onFeedback,
  onFollowUp,
  onInstall,
  onArtifactClick,
  dismissedSuggestions,
  onDismiss,
}: {
  message: UIMessage
  isStreaming: boolean
  isLastAssistant: boolean
  currentUserId: string
  feedback: 'like' | 'dislike' | null
  onFeedback: (messageId: string, feedback: 'like' | 'dislike') => void
  onFollowUp: (text: string) => void
  onInstall: (catalogId: string, name: string) => void
  onArtifactClick: (artifact: Artifact) => void
  dismissedSuggestions: Set<string>
  onDismiss: (messageId: string) => void
}) {
  const isUser = message.role === 'user'
  const parts = message.parts ?? []
  const textParts = parts.filter(isTextUIPart)
  const reasoningParts = parts.filter(isReasoningUIPart)
  const toolParts = parts.filter(isToolUIPart)

  const textContent = textParts.map((p) => p.text).join('')
  const reasoningText = reasoningParts.map((part) => part.text).join('\n\n')
  const lastPart = parts.at(-1)
  const isReasoningStreaming = isStreaming && lastPart?.type === 'reasoning'

  // Parse orchestrator-specific markers from assistant text
  const parsed = !isUser ? parseOrchestratorResponse(textContent) : null
  const displayText = parsed?.text ?? textContent

  return (
    <>
      <Message from={message.role}>
        {/* Snew avatar for assistant messages */}
        {!isUser && (
          <div className="mb-1 flex items-center gap-2">
            <div className="bg-foreground flex h-7 w-7 items-center justify-center rounded-full p-[5px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/snew.svg" alt="Snew" className="h-4 w-4 invert dark:invert-0" />
            </div>
            <span className="text-muted-foreground text-sm font-medium">Snew</span>
          </div>
        )}

        <MessageContent>
          {isUser ? (
            <p className="whitespace-pre-wrap">{textContent}</p>
          ) : (
            <>
              {/* Reasoning */}
              {reasoningParts.length > 0 && (
                <Reasoning isStreaming={isReasoningStreaming}>
                  <ReasoningTrigger />
                  <ReasoningContent>{reasoningText}</ReasoningContent>
                </Reasoning>
              )}

              {/* Tool invocations */}
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

              {/* Text response with Streamdown markdown */}
              {displayText && <MessageResponse>{displayText}</MessageResponse>}
            </>
          )}
        </MessageContent>

        {/* Actions for assistant messages */}
        {!isUser && displayText && !isStreaming && (
          <MessageActions>
            <MessageAction
              tooltip="Copiar"
              onClick={() => navigator.clipboard.writeText(displayText)}
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
              <ThumbsDownIcon
                className={cn('size-3.5', feedback === 'dislike' && 'fill-current')}
              />
            </MessageAction>
          </MessageActions>
        )}
      </Message>

      {/* Orchestrator-specific: Artifact chips */}
      {parsed?.artifacts && parsed.artifacts.length > 0 && !isStreaming && (
        <div className="-mt-4 flex flex-wrap gap-1.5 pb-2">
          {parsed.artifacts.map((artifact) => (
            <ArtifactChip
              key={artifact.id}
              id={artifact.id}
              title={artifact.title}
              type={artifact.type}
              onClick={() => onArtifactClick(artifact)}
            />
          ))}
        </div>
      )}

      {/* Orchestrator-specific: Co-worker suggestion card */}
      {parsed?.coworker && !dismissedSuggestions.has(message.id) && !isStreaming && (
        <div className="-mt-4 max-w-md pb-2">
          <CoworkerSuggestionCard
            coworker={parsed.coworker}
            onInstall={(catalogId) => onInstall(catalogId, parsed.coworker!.name)}
            onDismiss={() => onDismiss(message.id)}
          />
        </div>
      )}

      {/* Orchestrator-specific: Follow-up suggestions (only on last assistant message) */}
      {isLastAssistant && !isStreaming && parsed?.followUps && parsed.followUps.length > 0 && (
        <div className="-mt-4 pb-2">
          <FollowUpSuggestions suggestions={parsed.followUps} onSelect={onFollowUp} />
        </div>
      )}
    </>
  )
}

export default function OrchestratorChat({
  orchestratorId,
  currentUserId,
  teamId,
  initialConversationId,
  initialMessages,
  initialQuery,
}: OrchestratorChatProps) {
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null)
  const [installTarget, setInstallTarget] = useState<{
    catalogId: string
    name: string
  } | null>(null)

  const { messages, status, isLoading, isStreaming, error, sendMessage, startNewChat, stop } =
    useAgentChat(orchestratorId, currentUserId, {
      initialConversationId,
      initialMessages,
      initialQuery,
    })

  const hasMessages = messages.length > 0

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
    [messages]
  )

  // Message feedback
  const assistantMessageIds = useMemo(
    () => messages.filter((m) => m.role === 'assistant').map((m) => m.id),
    [messages]
  )
  const { getFeedback, toggleFeedback } = useMessageFeedback(orchestratorId, assistantMessageIds)

  // Register new chat handler for external trigger
  useEffect(() => {
    _newChatState.handler = startNewChat
    return () => {
      _newChatState.handler = null
    }
  }, [startNewChat])

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return null
  }, [messages])

  const handleSubmit = useCallback(
    (msg: PromptInputMessage) => {
      if (msg.text.trim() || msg.files.length > 0) {
        sendMessage(msg.text.trim(), msg.files.length > 0 ? msg.files : undefined)
      }
    },
    [sendMessage]
  )

  const handleSuggestionClick = useCallback((text: string) => sendMessage(text), [sendMessage])

  const handleDismiss = useCallback((messageId: string) => {
    setDismissedSuggestions((prev) => new Set(prev).add(messageId))
  }, [])

  const panelOpen = activeArtifact !== null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn('flex min-h-0 flex-1', panelOpen && 'md:mr-[420px]')}>
        <div className="flex min-h-0 flex-1 flex-col">
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto max-w-2xl">
              {!hasMessages ? (
                <ConversationEmptyState>
                  <div className="bg-foreground flex h-16 w-16 items-center justify-center rounded-full p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/snew.svg" alt="Snew" className="h-9 w-9 invert dark:invert-0" />
                  </div>
                  <h2 className="text-foreground mt-6 text-xl font-semibold">Snew</h2>
                  <p className="text-muted-foreground mt-1 max-w-md text-center text-sm leading-relaxed">
                    Seu assistente central. Pergunte qualquer coisa sobre sua loja, co-workers ou
                    automações.
                  </p>
                  {SUGGESTION_STARTERS.length > 0 && (
                    <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-3">
                      {SUGGESTION_STARTERS.map((starter) => (
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
                  <OrchestratorMessageItem
                    key={message.id}
                    message={message}
                    isStreaming={isStreaming && message.id === lastAssistantId}
                    isLastAssistant={message.id === lastAssistantId}
                    currentUserId={currentUserId}
                    feedback={getFeedback(message.id)}
                    onFeedback={toggleFeedback}
                    onFollowUp={handleSuggestionClick}
                    onInstall={(catalogId, name) => setInstallTarget({ catalogId, name })}
                    onArtifactClick={setActiveArtifact}
                    dismissedSuggestions={dismissedSuggestions}
                    onDismiss={handleDismiss}
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

          {/* Prompt input — same pattern as agent ChatPanel */}
          <div className="bg-background sticky bottom-0 px-4 py-4">
            <div className="[&_[data-slot=input-group]]:border-border [&_[data-slot=input-group]]:bg-muted/40 mx-auto max-w-2xl [&_[data-slot=input-group]]:rounded-2xl [&_[data-slot=input-group]]:shadow-none">
              <PromptInput onSubmit={handleSubmit}>
                <PromptInputTextarea
                  placeholder="Pergunte qualquer coisa ao Snew..."
                  disabled={isLoading}
                />
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
      </div>

      {/* Artifact side panel */}
      <ArtifactPanel artifact={activeArtifact} onClose={() => setActiveArtifact(null)} />

      {/* Install wizard modal */}
      {installTarget && (
        <InstallWizardModal
          agentId={installTarget.catalogId}
          agentName={installTarget.name}
          teamId={teamId}
          userId={currentUserId}
          onClose={() => setInstallTarget(null)}
        />
      )}
    </div>
  )
}
