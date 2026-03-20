'use client'

import type { UIMessage } from 'ai'
import { isTextUIPart, isReasoningUIPart } from 'ai'
import {
  ArrowUp,
  Square,
  CornerDownRight,
  Share,
  Download,
  CopyIcon,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning'

import { useOrchestratorChat } from '@/hooks/use-orchestrator-chat'
import { generateFollowUps } from '@/lib/actions/follow-ups'
import SnewAvatar from './snew-avatar'
import OrchestratorEmptyState from './orchestrator-empty-state'

const ORCHESTRATOR_STARTERS = [
  'Quais carrinhos têm maior chance de conversão?',
  'Quanto vendi hoje?',
  'Quais clientes estão em risco de churn?',
  'Como estão meus co-workers?',
]

// Module-level callback for new chat trigger from sidebar
const _newChatState: { handler: (() => void) | null } = { handler: null }
export function triggerOrchestratorNewChat() {
  _newChatState.handler?.()
}

interface OrchestratorChatWrapperProps {
  initialConversationId: string | null
  initialMessages: { id: string; role: string; content: string }[]
  initialQuery?: string
}

export default function OrchestratorChatWrapper({
  initialConversationId,
  initialMessages,
  initialQuery,
}: OrchestratorChatWrapperProps) {
  const { messages, status, isLoading, isStreaming, error, sendMessage, startNewChat, stop } =
    useOrchestratorChat({
      initialConversationId,
      initialMessages,
      initialQuery,
    })

  const hasMessages = messages.length > 0
  const visibleMessages = useMemo(
    () => messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
    [messages]
  )
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return null
  }, [messages])

  // Dynamic follow-ups via server action — same pattern as InstalledAgentPage
  const lastAssistantText = !isStreaming
    ? visibleMessages
        .findLast((m) => m.role === 'assistant')
        ?.parts?.filter(isTextUIPart)
        .map((p) => p.text)
        .join('')
    : null
  const { data: dynamicFollowUps = [] } = useQuery({
    queryKey: ['follow-ups', 'orchestrator', lastAssistantId],
    queryFn: () => generateFollowUps(lastAssistantText ?? '', 'Snew'),
    enabled: !!lastAssistantId && !!lastAssistantText && !isStreaming,
    staleTime: Infinity,
  })

  // Register new chat handler
  useEffect(() => {
    _newChatState.handler = startNewChat
    return () => {
      _newChatState.handler = null
    }
  }, [startNewChat])

  const handleSuggestion = useCallback((text: string) => sendMessage(text), [sendMessage])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const form = e.target as HTMLFormElement
      const textarea = form.querySelector('textarea')
      const text = textarea?.value?.trim()
      if (!text) return
      sendMessage(text)
      if (textarea) textarea.value = ''
    },
    [sendMessage]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-3xl px-5">
          {!hasMessages ? (
            <ConversationEmptyState className="min-h-[60vh]">
              <OrchestratorEmptyState
                starters={ORCHESTRATOR_STARTERS}
                onSuggestionClick={handleSuggestion}
              />
            </ConversationEmptyState>
          ) : (
            visibleMessages.map((msg) => {
              const isUser = msg.role === 'user'
              const isLast = msg.id === visibleMessages[visibleMessages.length - 1]?.id
              const parts = msg.parts ?? []
              const textParts = parts.filter(isTextUIPart)
              const reasoningParts = parts.filter(isReasoningUIPart)
              const textContent = textParts.map((p) => p.text).join('')
              const reasoningText = reasoningParts.map((p) => p.text).join('\n\n')

              return (
                <Message key={msg.id} from={msg.role}>
                  {/* Snew avatar for assistant messages */}
                  {!isUser && (
                    <div className="mb-0.5 flex items-center gap-2">
                      <SnewAvatar size={20} />
                      <span className="text-foreground/60 text-xs font-medium">Snew</span>
                    </div>
                  )}
                  <MessageContent>
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{textContent}</p>
                    ) : (
                      <>
                        {reasoningParts.length > 0 && (
                          <Reasoning
                            isStreaming={
                              isStreaming && isLast && parts[parts.length - 1]?.type === 'reasoning'
                            }
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{reasoningText}</ReasoningContent>
                          </Reasoning>
                        )}
                        <MessageResponse>{textContent}</MessageResponse>
                      </>
                    )}
                  </MessageContent>

                  {/* Action bar — same as InstalledAgentPage */}
                  {!isUser && textContent && !isStreaming && (
                    <div className="mt-2 flex w-full items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          title="Compartilhar"
                          className="text-muted-foreground/60 hover:text-foreground/70 hover:bg-muted flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                        >
                          <Share className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Download"
                          className="text-muted-foreground/60 hover:text-foreground/70 hover:bg-muted flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Copiar"
                          onClick={() => navigator.clipboard.writeText(textContent)}
                          className="text-muted-foreground/60 hover:text-foreground/70 hover:bg-muted flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                        >
                          <CopyIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Regenerar"
                          className="text-muted-foreground/60 hover:text-foreground/70 hover:bg-muted flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          title="Útil"
                          className="text-muted-foreground/60 hover:text-foreground/70 hover:bg-muted flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Não útil"
                          className="text-muted-foreground/60 hover:text-foreground/70 hover:bg-muted flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Follow-ups — same pattern as InstalledAgentPage */}
                  {!isUser &&
                    isLast &&
                    !isStreaming &&
                    textContent &&
                    dynamicFollowUps.length > 0 && (
                      <div className="mt-2 flex w-full flex-col">
                        <p className="text-foreground/50 mb-1.5 text-xs font-medium">
                          Acompanhamentos
                        </p>
                        <div className="divide-border flex flex-col divide-y">
                          {dynamicFollowUps.map((chip) => (
                            <button
                              key={chip}
                              onClick={() => handleSuggestion(chip)}
                              className="text-foreground/70 hover:text-foreground group flex items-center gap-2 py-2 text-left text-sm transition-colors"
                            >
                              <CornerDownRight className="text-muted-foreground group-hover:text-foreground/60 h-3 w-3 shrink-0 transition-colors" />
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </Message>
              )
            })
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {error && (
        <div className="border-destructive/20 bg-destructive/10 text-destructive mx-4 mb-2 rounded-lg border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Chat input — same styling as InstalledAgentPage */}
      <div className="shrink-0 pt-2 pb-5">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-5">
          <form onSubmit={handleSubmit}>
            <div className="border-border focus-within:border-foreground/30 focus-within:bg-background bg-muted/40 overflow-hidden rounded-2xl border shadow-sm transition-all">
              <textarea
                rows={2}
                placeholder="Pergunte qualquer coisa ao Snew..."
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    const form = e.currentTarget.closest('form')
                    form?.requestSubmit()
                  }
                }}
                className="placeholder:text-muted-foreground max-h-48 w-full resize-none rounded-t-2xl bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed outline-none"
              />
              <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-3">
                <div className="flex-1" />
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all ${
                    isStreaming
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-foreground/40 hover:border-foreground/40 hover:text-foreground/60'
                  }`}
                  onClick={(e) => {
                    if (isStreaming) {
                      e.preventDefault()
                      stop()
                    }
                  }}
                >
                  {isStreaming ? (
                    <Square className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
