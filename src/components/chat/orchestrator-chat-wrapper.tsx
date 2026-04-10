'use client'

import { isTextUIPart, isReasoningUIPart, isFileUIPart } from 'ai'
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
  ChevronDown,
  Paperclip,
  X,
  ExternalLink,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning'

import { useOrchestratorChat } from '@/hooks/use-orchestrator-chat'
import { uploadChatFileAction } from '@/lib/actions/chat-upload'
import { generateFollowUps } from '@/lib/actions/follow-ups'
import SnewAvatar from './snew-avatar'
import OrchestratorEmptyState from './orchestrator-empty-state'
import { SkillProgressQueue } from './skill-progress-queue'

const ORCHESTRATOR_STARTERS = [
  'Quais carrinhos têm maior chance de conversão?',
  'Quanto vendi hoje?',
  'Quais clientes estão em risco de churn?',
  'Como estão meus co-workers?',
]

// Module-level event bus for sidebar "new chat" trigger.
// Limitation: only supports single mounted instance. Consider Zustand if multiple instances needed.
const _newChatState: { handler: (() => void) | null } = { handler: null }
export function triggerOrchestratorNewChat() {
  _newChatState.handler?.()
}

interface SkillProgress {
  skillName: string | null
  steps: Array<{ label: string; done: boolean }>
}

interface OrchestratorChatWrapperProps {
  initialConversationId: string | null
  initialMessages: { id: string; role: string; content: string }[]
  initialQuery?: string
  taskId?: string
  skillProgress?: SkillProgress
}

/** Extract Composio connection URLs from tool-result parts */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractConnectionUrls(parts: any[]): Array<{ app: string; url: string }> {
  const results: Array<{ app: string; url: string }> = []
  for (const part of parts) {
    if (part.type !== 'tool-result') continue
    try {
      const result = typeof part.result === 'string' ? JSON.parse(part.result) : part.result
      // Composio MANAGE_CONNECTIONS returns redirectUrl or url
      const url = result?.redirectUrl ?? result?.url ?? result?.data?.redirectUrl
      if (typeof url === 'string' && url.includes('composio.dev')) {
        const app =
          result?.app ?? result?.toolkit ?? part.toolName?.replace('COMPOSIO_', '') ?? 'App'
        results.push({ app: String(app), url })
      }
    } catch {
      /* not JSON, skip */
    }
  }
  return results
}

const MODEL_OPTIONS = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', short: 'Opus' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', short: 'Sonnet' },
] as const

export default function OrchestratorChatWrapper({
  initialConversationId,
  initialMessages,
  initialQuery,
  taskId,
  skillProgress,
}: OrchestratorChatWrapperProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window === 'undefined') return MODEL_OPTIONS[0].id
    return localStorage.getItem('snew-chat-model') || MODEL_OPTIONS[0].id
  })
  const [modelMenuOpen, setModelMenuOpen] = useState(false)

  const {
    messages,
    status,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    startNewChat,
    stop,
    setModel,
  } = useOrchestratorChat({
    initialConversationId,
    initialMessages,
    initialQuery,
    taskId,
    model: selectedModel,
  })

  // Keep hook model ref in sync
  useEffect(() => {
    setModel(selectedModel)
  }, [selectedModel, setModel])

  // Refetch task data when AI finishes responding (catches SNEW_MODIFY_ARTIFACT changes).
  // This is intentionally event-driven (streaming→ready transition), not derived state.
  // TODO: replace with an onFinish callback once the AI SDK exposes one at this level.
  const queryClient = useQueryClient()
  const prevStatusRef = useRef(status)
  useEffect(() => {
    if (prevStatusRef.current === 'streaming' && status === 'ready' && taskId) {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    }
    prevStatusRef.current = status
  }, [status, taskId, queryClient])

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
    async (e: React.FormEvent) => {
      e.preventDefault()
      const form = e.target as HTMLFormElement
      const textarea = form.querySelector('textarea')
      const text = textarea?.value?.trim()
      if (!text && pendingFiles.length === 0) return

      if (pendingFiles.length > 0) {
        const fileParts = await Promise.all(
          pendingFiles.map(async (file) => {
            // Upload to Supabase Storage for a public URL
            const formData = new FormData()
            formData.append('file', file)
            const result = await uploadChatFileAction(formData)
            const url = result.url
            if (!url) {
              // Fallback to data URL if upload fails
              const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.readAsDataURL(file)
              })
              return {
                type: 'file' as const,
                url: dataUrl,
                mediaType: file.type,
                filename: file.name,
              }
            }
            return { type: 'file' as const, url, mediaType: file.type, filename: file.name }
          })
        )
        // Append public URLs to the text so the AI has them as strings (for Instagram API, etc.)
        const publicUrls = fileParts.filter((f) => f.url.startsWith('http')).map((f) => f.url)
        const textWithUrls =
          publicUrls.length > 0
            ? `${text || ''}\n\n[Arquivos anexados — URLs públicas]\n${publicUrls.join('\n')}`.trim()
            : text || ''
        sendMessage(textWithUrls, fileParts)
        setPendingFiles([])
      } else {
        sendMessage(text || '')
      }
      if (textarea) textarea.value = ''
    },
    [sendMessage, pendingFiles]
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
            <>
              {visibleMessages.map((msg) => {
                const isUser = msg.role === 'user'
                const isLast = msg.id === visibleMessages[visibleMessages.length - 1]?.id
                const parts = msg.parts ?? []
                const textParts = parts.filter(isTextUIPart)
                const reasoningParts = parts.filter(isReasoningUIPart)
                const rawText = textParts.map((p) => p.text).join('')
                const reasoningText = reasoningParts.map((p) => p.text).join('\n\n')

                const textContent = rawText

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
                        <>
                          {parts.filter(isFileUIPart).map((filePart, i) =>
                            filePart.mediaType.startsWith('image/') ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={filePart.url}
                                alt={filePart.filename || 'Attached image'}
                                className="mb-2 max-h-64 rounded-xl object-cover"
                              />
                            ) : (
                              <div
                                key={i}
                                className="bg-muted mb-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                <span>{filePart.filename || 'Arquivo'}</span>
                              </div>
                            )
                          )}
                          {rawText && <p className="whitespace-pre-wrap">{rawText}</p>}
                        </>
                      ) : (
                        <>
                          {reasoningParts.length > 0 && (
                            <Reasoning
                              isStreaming={
                                isStreaming &&
                                isLast &&
                                parts[parts.length - 1]?.type === 'reasoning'
                              }
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{reasoningText}</ReasoningContent>
                            </Reasoning>
                          )}
                          {(() => {
                            // Extract Composio connection links from markdown and render as buttons
                            const composioLinkRegex =
                              /\[([^\]]+)\]\((https?:\/\/[^\s)]*composio[^\s)]*)\)/g
                            const composioLinks: Array<{ label: string; url: string }> = []
                            let cleanedText = textContent
                            let match
                            while ((match = composioLinkRegex.exec(textContent)) !== null) {
                              composioLinks.push({
                                label: match[1].replace(/\*\*/g, '').replace(/\*/g, ''),
                                url: match[2],
                              })
                            }
                            // Remove the markdown link lines + surrounding emoji/text from displayed text
                            if (composioLinks.length > 0) {
                              cleanedText = cleanedText
                                .replace(
                                  /👉\s*\[([^\]]+)\]\(https?:\/\/[^\s)]*composio[^\s)]*\)/g,
                                  ''
                                )
                                .replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]*composio[^\s)]*\)/g, '')
                                .replace(/\n{3,}/g, '\n\n')
                                .trim()
                            }
                            return (
                              <>
                                <MessageResponse>{cleanedText}</MessageResponse>
                                {composioLinks.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {composioLinks.map((link, i) => (
                                      <a
                                        key={i}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-foreground/90 text-background hover:bg-foreground inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all active:scale-[0.98]"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                        {link.label}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </>
                            )
                          })()}
                          {/* Composio connection buttons from tool results */}
                          {(() => {
                            const connUrls = extractConnectionUrls(parts)
                            if (connUrls.length === 0) return null
                            return (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {connUrls.map((conn, i) => (
                                  <a
                                    key={i}
                                    href={conn.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-foreground text-background inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Conectar {conn.app}
                                  </a>
                                ))}
                              </div>
                            )
                          })()}
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
              })}

              {/* Thinking indicator — shows while waiting OR streaming without visible text */}
              {(status === 'submitted' ||
                (isStreaming &&
                  !visibleMessages.some(
                    (m) =>
                      m.role === 'assistant' &&
                      m.parts?.some((p) => isTextUIPart(p) && p.text.length > 0)
                  ))) && (
                <Message from="assistant">
                  <div className="mb-0.5 flex items-center gap-2">
                    <SnewAvatar size={20} />
                    <span className="text-foreground/60 text-xs font-medium">Snew</span>
                  </div>
                  <MessageContent>
                    <div className="flex items-center gap-1.5 py-1">
                      <span
                        className="bg-foreground/30 h-1.5 w-1.5 rounded-full"
                        style={{
                          animation: 'typing-dot 1.2s ease-in-out infinite',
                          animationDelay: '0ms',
                        }}
                      />
                      <span
                        className="bg-foreground/30 h-1.5 w-1.5 rounded-full"
                        style={{
                          animation: 'typing-dot 1.2s ease-in-out infinite',
                          animationDelay: '200ms',
                        }}
                      />
                      <span
                        className="bg-foreground/30 h-1.5 w-1.5 rounded-full"
                        style={{
                          animation: 'typing-dot 1.2s ease-in-out infinite',
                          animationDelay: '400ms',
                        }}
                      />
                    </div>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
          {skillProgress && skillProgress.steps.length > 0 && (
            <SkillProgressQueue skillName={skillProgress.skillName} steps={skillProgress.steps} />
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
              {/* File preview */}
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-3">
                  {pendingFiles.map((file, i) => (
                    <div
                      key={i}
                      className="bg-muted relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
                    >
                      {file.type.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : null}
                      <span className="text-foreground/70 max-w-[120px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setPendingFiles((f) => f.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-foreground -mr-0.5 ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.csv,.json"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  if (files.length > 0) setPendingFiles((prev) => [...prev, ...files])
                  e.target.value = ''
                }}
              />
              <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-3">
                <div className="relative flex flex-1 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                    title="Anexar arquivo"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setModelMenuOpen((o) => !o)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                  >
                    {MODEL_OPTIONS.find((m) => m.id === selectedModel)?.label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                  {modelMenuOpen && (
                    <div className="border-border bg-popover text-popover-foreground absolute bottom-full left-0 mb-1 w-48 rounded-lg border p-1 shadow-lg">
                      {MODEL_OPTIONS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedModel(m.id)
                            localStorage.setItem('snew-chat-model', m.id)
                            setModelMenuOpen(false)
                          }}
                          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors ${
                            selectedModel === m.id
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
