'use client'

import type { UIMessage } from 'ai'
import { isTextUIPart, isReasoningUIPart, isToolUIPart } from 'ai'
import { Link2, Mic, Plus, X, XIcon, FileIcon } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputHeader,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  usePromptInputAttachments,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning'
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import SkillsList from '@/components/agent-detail/skills-list'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useMessageFeedback } from '@/hooks/use-message-feedback'
import { cn } from '@/lib/utils'
import { getAgentModalData } from '@/lib/actions/agent-modal-data'
import { getAgentSkills } from '@/lib/actions/agent-skills'

interface AgentItem {
  id: string
  name: string
  description: string | null
  palette: string
  is_active: boolean
  category?: string | null
}

interface AgentDetailModalProps {
  agent: AgentItem | null
  teamId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const APP_DISPLAY: Record<string, string> = {
  nuvemshop: 'Nuvemshop',
  shopify: 'Shopify',
  github: 'GitHub',
  slack: 'Slack',
  gmail: 'Gmail',
  notion: 'Notion',
  linear: 'Linear',
  mercadolivre: 'Mercado Livre',
  google_calendar: 'Google Calendar',
  google_analytics: 'Google Analytics',
  googleanalytics: 'Google Analytics',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  discord: 'Discord',
}

function formatAppName(appId: string): string {
  return (
    APP_DISPLAY[appId] ??
    appId
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  )
}

/** Format a tool name for display (SCREAMING_SNAKE -> Title Case) */
function formatToolName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function AgentDetailModal({
  agent,
  teamId: _teamId,
  open,
  onOpenChange,
}: AgentDetailModalProps) {
  const agentId = agent?.id ?? ''

  const { data: modalData, isLoading: modalLoading } = useQuery({
    queryKey: ['agent-modal-data', agentId],
    queryFn: () => getAgentModalData(agentId),
    enabled: open && !!agentId,
    gcTime: 0,
  })

  const { data: skillsRaw = [] } = useQuery({
    queryKey: ['agent-skills', agentId],
    queryFn: () => getAgentSkills(agentId),
    enabled: open && !!agentId,
  })
  // Coerce nullable DB columns into the non-nullable Skill shape the
  // component expects. The underlying columns are `content|source|type`
  // (nullable) and `metadata` jsonb (renamed from the legacy
  // `parameters` column during the 2026-04-15 schema refactor).
  const skills = skillsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    content: s.content ?? '',
    source: s.source ?? 'manual',
    is_enabled: s.is_enabled,
    type: s.type ?? 'content',
    parameters: s.parameters,
    version: s.version ?? 1,
  }))

  if (!agent) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[90vh] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:mx-4 sm:max-w-6xl lg:mx-8"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-6 py-4">
          <span className="bg-muted flex size-10 items-center justify-center rounded-full text-lg">
            💬
          </span>
          <div className="flex-1">
            <DialogTitle className="text-base font-semibold">{agent.name}</DialogTitle>
            <p className="text-muted-foreground text-sm">{agent.name}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Chat with prototype layout */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {modalLoading || !modalData ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-muted-foreground text-sm">Carregando...</div>
              </div>
            ) : (
              <ModalChatPanel
                key={modalData.conversationId ?? 'new'}
                agentId={agentId}
                agentName={agent.name}
                conversationStarters={modalData.conversationStarters}
                currentUserId={modalData.currentUserId}
                initialConversationId={modalData.conversationId}
                initialMessages={modalData.messages}
              />
            )}
          </div>

          {/* Right: Sidebar (prototype layout) */}
          <aside className="bg-muted/30 w-[380px] min-w-0 shrink-0 overflow-hidden border-l">
            <div className="h-full overflow-x-hidden overflow-y-auto">
              <div className="w-full min-w-0 p-4">
                {/* Agent Info */}
                <div className="mb-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-muted flex size-10 items-center justify-center rounded-full text-lg">
                      💬
                    </span>
                    <div>
                      <h1 className="text-sm font-semibold">{agent.name}</h1>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-green-500" />
                          {agent.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {agent.description ?? 'No description available.'}
                  </p>
                </div>

                {/* Run Agent */}
                <Button className="mb-6 w-full gap-2" variant="default">
                  ▶ Run Agent
                </Button>

                {/* Channels — real connected apps in list format */}
                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-semibold tracking-wider uppercase">Channels</h2>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                    >
                      <Link2 className="size-3" />
                      Connect
                    </button>
                  </div>
                  <div className="space-y-2">
                    {modalData && modalData.connectedApps.length > 0 ? (
                      modalData.connectedApps.map((app) => (
                        <div key={app.app_id} className="flex items-center justify-between text-sm">
                          <span>{formatAppName(app.app_id)}</span>
                          <span className="bg-foreground text-background rounded-md px-2 py-0.5 text-xs">
                            Active
                          </span>
                        </div>
                      ))
                    ) : modalData ? (
                      <p className="text-muted-foreground text-xs">Nenhum canal conectado</p>
                    ) : (
                      <div className="bg-muted h-6 animate-pulse rounded" />
                    )}
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-3">
                  <h2 className="text-xs font-semibold tracking-wider uppercase">Skills</h2>
                  <SkillsList skills={skills} agentId={agentId} />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Modal Chat Panel — uses same AI SDK elements as ChatPanel but with
// the prototype's Activity Log layout
// ---------------------------------------------------------------------------

function ModalMessageItem({
  message,
  agentName,
  isStreaming,
  currentUserId,
  feedback,
  onFeedback,
}: {
  message: UIMessage
  agentName: string
  isStreaming: boolean
  currentUserId: string
  feedback: 'like' | 'dislike' | null
  onFeedback: (messageId: string, feedback: 'like' | 'dislike') => void
}) {
  const isUser = message.role === 'user'
  const meta = message.metadata as Record<string, unknown> | undefined
  const senderId = meta?.senderId as string | undefined
  const isOwnMessage = !senderId || senderId === currentUserId

  const parts = message.parts ?? []
  const textParts = parts.filter(isTextUIPart)
  const reasoningParts = parts.filter(isReasoningUIPart)
  const toolParts = parts.filter(isToolUIPart)
  const fileParts = parts.filter(
    (p): p is { type: 'file'; url: string; mediaType: string; filename?: string } =>
      p.type === 'file'
  )
  const textContent = textParts.map((p) => p.text).join('')
  const reasoningText = reasoningParts.map((part) => part.text).join('\n\n')
  const lastPart = parts.at(-1)
  const isReasoningStreaming = isStreaming && lastPart?.type === 'reasoning'
  const messageFrom = isUser && !isOwnMessage ? 'assistant' : message.role

  return (
    <Message from={messageFrom}>
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
            {reasoningParts.length > 0 && (
              <Reasoning isStreaming={isReasoningStreaming}>
                <ReasoningTrigger />
                <ReasoningContent>{reasoningText}</ReasoningContent>
              </Reasoning>
            )}
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
            {textContent && <MessageResponse>{textContent}</MessageResponse>}
          </>
        )}
      </MessageContent>
    </Message>
  )
}

function ModalAttachButton() {
  const attachments = usePromptInputAttachments()
  return (
    <PromptInputButton tooltip="Anexar arquivos" onClick={() => attachments.openFileDialog()}>
      <Plus className="size-4" />
    </PromptInputButton>
  )
}

function ModalAttachmentPreviews() {
  const attachments = usePromptInputAttachments()
  if (attachments.files.length === 0) return null

  return (
    <PromptInputHeader>
      {attachments.files.map((file) => {
        const isImage = file.mediaType?.startsWith('image/')
        return (
          <div
            key={file.id}
            className="bg-muted group relative flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
          >
            {isImage && file.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file.url}
                alt={file.filename ?? 'attachment'}
                className="h-8 w-8 rounded object-cover"
              />
            ) : (
              <FileIcon className="text-muted-foreground h-4 w-4 shrink-0" />
            )}
            <span className="max-w-[120px] truncate">{file.filename ?? 'file'}</span>
            <button
              type="button"
              onClick={() => attachments.remove(file.id)}
              className="text-muted-foreground hover:text-foreground -mr-1 shrink-0"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </PromptInputHeader>
  )
}

function ModalChatPanel({
  agentId,
  agentName,
  conversationStarters,
  currentUserId,
  initialConversationId,
  initialMessages,
}: {
  agentId: string
  agentName: string
  conversationStarters: string[]
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
}) {
  const { messages, status, isLoading, isStreaming, error, sendMessage, stop } = useAgentChat(
    agentId,
    currentUserId,
    {
      initialConversationId,
      initialMessages,
    }
  )

  const hasMessages = messages.length > 0

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
    [messages]
  )

  const assistantMessageIds = useMemo(
    () => messages.filter((m) => m.role === 'assistant').map((m) => m.id),
    [messages]
  )
  const { getFeedback, toggleFeedback } = useMessageFeedback(agentId, assistantMessageIds)

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return null
  }, [messages])

  const handleSuggestionClick = useCallback(
    (suggestion: string) => sendMessage(suggestion),
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Activity Log header */}
      <div className="shrink-0 px-6 pt-6 pb-2">
        <h2 className="text-base font-semibold">Activity Log</h2>
      </div>

      {/* Messages area using AI SDK Conversation */}
      <Conversation className="flex-1">
        <ConversationContent className="px-6">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4 text-sm">
                Nenhuma atividade ainda. Inicie uma conversa com o agente.
              </p>
              {conversationStarters.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {conversationStarters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => handleSuggestionClick(starter)}
                      className="hover:bg-accent rounded-lg border px-3 py-2 text-left text-sm transition-colors"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            visibleMessages.map((message) => (
              <ModalMessageItem
                key={message.id}
                message={message}
                agentName={agentName}
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

      {/* Chat Input — prototype style with AI SDK PromptInput */}
      <div className="border-t p-4">
        <PromptInput onSubmit={handleSubmit} multiple>
          <ModalAttachmentPreviews />
          <PromptInputTextarea placeholder="Ask the agent anything..." disabled={isLoading} />
          <PromptInputFooter>
            <PromptInputTools>
              <ModalAttachButton />
              <PromptInputButton tooltip="Voz">
                <Mic className="size-4" />
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
