'use client'

import { useCallback, useState } from 'react'
import {
  Clock,
  Copy,
  Plug,
  SlidersHorizontal,
  ArrowUp,
  Square,
  CornerDownRight,
  Share,
  Download,
  CopyIcon,
  RefreshCw,
  ClipboardList,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
} from 'lucide-react'
import CoworkerAvatar from '@/components/coworker-avatar'
import { useAgentWorkspaceStore } from '@/stores/agent-workspace-store'
import { useAgentChat } from '@/hooks/use-agent-chat'
import { useCoworkerAvatars } from '@/hooks/use-coworker-avatars'
import { cn } from '@/lib/utils'
import AgentActivityFeed from './agent-activity-feed'
import ArtifactPanel from './artifact-panel'
import ModuleList from './module-list'
import AgentResultsTab from './agent-results-tab'
import AgentConnectionsTab from './agent-connections-tab'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning'
import { isTextUIPart, isReasoningUIPart, isToolUIPart } from 'ai'
import BoringAvatar from 'boring-avatars'
import { getAgentPalette } from '@/lib/agent-palettes'

interface InstalledAgentPageProps {
  agentId: string
  agentName: string
  agentDescription?: string | null
  agentType: string
  agentPalette: string
  agentAvatarSrc?: string
  teamId: string
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
}

const SUGGESTION_PILLS = [
  'Mostrar carrinhos de maior valor',
  'Qual a taxa de recuperação?',
  'Ajustar oferta de desconto',
]

const CHAT_FOLLOW_UPS = [
  'Mais detalhes sobre isso',
  'Resumir em 3 pontos',
  'Quais próximos passos?',
  'Gerar relatório completo',
]

export default function InstalledAgentPage({
  agentId,
  agentName,
  agentDescription,
  agentType,
  agentPalette,
  agentAvatarSrc: agentAvatarSrcProp,
  teamId,
  currentUserId,
  initialConversationId,
  initialMessages,
}: InstalledAgentPageProps) {
  const { setActiveTab, activeTab, selectedArtifactId } = useAgentWorkspaceStore()
  const [chatInput, setChatInput] = useState('')
  const hasArtifact = !!selectedArtifactId

  // Resolve avatar — try prop first, then look up by agentType's first module ID, then agent name slug
  const { avatars } = useCoworkerAvatars()
  const AGENT_TYPE_AVATAR_MAP: Record<string, string> = {
    'carrinho-conversao': 'abandoned-cart',
  }
  const avatarKey = AGENT_TYPE_AVATAR_MAP[agentType] ?? agentName.toLowerCase().replace(/\s+/g, '-')
  const agentAvatarSrc = agentAvatarSrcProp ?? avatars[avatarKey] ?? undefined

  const { messages, status, isLoading, isStreaming, sendMessage, stop } = useAgentChat(
    agentId,
    currentUserId,
    {
      initialConversationId,
      initialMessages,
    }
  )

  const visibleMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant')
  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id ?? null

  const handleSubmit = useCallback(
    (msg: PromptInputMessage) => {
      if (msg.text.trim()) {
        sendMessage(msg.text.trim())
      }
    },
    [sendMessage]
  )

  const handleChatSend = useCallback(() => {
    if (chatInput.trim()) {
      sendMessage(chatInput.trim())
      setChatInput('')
    }
  }, [chatInput, sendMessage])

  const handleSuggestion = useCallback(
    (text: string) => {
      sendMessage(text)
    },
    [sendMessage]
  )

  return (
    <div className="bg-muted/40 flex h-full w-full flex-1 flex-col overflow-hidden">
      {/* Topbar — no border */}
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <CoworkerAvatar src={agentAvatarSrc} name={agentName} size="xs" className="!h-5 !w-5" />
          <span className="text-foreground/70 text-[12px] leading-none font-normal">
            {agentName}
          </span>
        </div>

        {/* Right: icon buttons */}
        <div className="flex items-center gap-0.5">
          <TopbarButton
            icon={<Clock className="h-[15px] w-[15px]" />}
            title="Histórico"
            onClick={() => setActiveTab('activity')}
          />
          <TopbarButton
            icon={<Copy className="h-[15px] w-[15px]" />}
            title="Arquivos"
            onClick={() => setActiveTab('results')}
          />
          <TopbarButton
            icon={<Plug className="h-[15px] w-[15px]" />}
            title="Integrações"
            onClick={() => setActiveTab('connections')}
          />
          <TopbarButton
            icon={<SlidersHorizontal className="h-[15px] w-[15px]" />}
            title="Configurações"
            onClick={() => setActiveTab('configure')}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Chat+activity OR workspace tabs */}
        {activeTab === 'activity' ? (
          <div className="flex min-w-0 flex-1 flex-col">
            {/* White card */}
            <div
              className={cn(
                'border-border/40 bg-background mx-3 mb-3 flex flex-1 flex-col overflow-hidden rounded-2xl border shadow-sm',
                hasArtifact && 'mr-0 rounded-r-none'
              )}
            >
              {/* Scrollable area: activity feed + chat messages */}
              <Conversation className="flex-1">
                <ConversationContent className="mx-auto w-full max-w-2xl px-8 pt-8 pb-6">
                  {/* Activity feed — always at top */}
                  <AgentActivityFeed
                    agentId={agentId}
                    agentName={agentName}
                    agentAvatarSrc={agentAvatarSrc}
                  />

                  {/* Chat messages below activity */}
                  {visibleMessages.map((message) => {
                    const isUser = message.role === 'user'
                    const parts = message.parts ?? []
                    const textContent = parts
                      .filter(isTextUIPart)
                      .map((p) => p.text)
                      .join('')
                    const reasoningParts = parts.filter(isReasoningUIPart)
                    const reasoningText = reasoningParts.map((p) => p.text).join('\n\n')
                    const isLast = message.id === lastAssistantId

                    return (
                      <Message key={message.id} from={message.role as 'user' | 'assistant'}>
                        {!isUser && (
                          <div className="mb-1 flex items-center gap-2">
                            <CoworkerAvatar
                              src={agentAvatarSrc}
                              name={agentName}
                              size="xs"
                              className="!h-5 !w-5"
                            />
                            <span className="text-foreground/60 text-xs font-medium">
                              {agentName}
                            </span>
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
                                    isStreaming &&
                                    isLast &&
                                    parts[parts.length - 1]?.type === 'reasoning'
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
                        {/* Action bar — assistant messages only, after streaming */}
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
                              <div className="text-muted-foreground/50 ml-1 flex items-center gap-1 text-xs">
                                <ClipboardList className="h-3 w-3" />
                                <span>fontes</span>
                              </div>
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
                              <button
                                type="button"
                                title="Mais opções"
                                className="text-muted-foreground/60 hover:text-foreground/70 hover:bg-muted flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Acompanhamentos — after last assistant message */}
                        {!isUser && isLast && !isStreaming && textContent && (
                          <div className="mt-2 flex w-full flex-col">
                            <p className="text-foreground/50 mb-1.5 text-xs font-medium">
                              Acompanhamentos
                            </p>
                            <div className="divide-border flex flex-col divide-y">
                              {CHAT_FOLLOW_UPS.map((chip) => (
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
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>

              {/* Chat input — fixed at bottom, same width as content */}
              <div className="shrink-0 px-6 pt-2 pb-5">
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
                  {/* Rounded input box */}
                  <div className="border-border focus-within:border-foreground/30 focus-within:bg-background bg-muted/40 overflow-hidden rounded-2xl border shadow-sm transition-all">
                    <textarea
                      rows={2}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleChatSend()
                        }
                      }}
                      placeholder={`Message ${agentName}...`}
                      disabled={isLoading}
                      className="text-foreground placeholder:text-muted-foreground max-h-36 w-full resize-none bg-transparent px-5 pt-4 pb-4 text-sm leading-relaxed outline-none"
                    />
                  </div>
                  {/* Chips + send button — outside box */}
                  <div className="flex items-center gap-2">
                    <div className="scrollbar-none flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
                      {SUGGESTION_PILLS.map((pill) => (
                        <button
                          key={pill}
                          type="button"
                          onClick={() => handleSuggestion(pill)}
                          className="border-border bg-background text-muted-foreground hover:text-foreground/80 hover:border-foreground/20 hover:bg-muted/60 shrink-0 rounded-full border px-3 py-1.5 text-[11px] whitespace-nowrap transition-all"
                        >
                          {pill}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleChatSend}
                      disabled={!chatInput.trim() || isLoading}
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all',
                        chatInput.trim()
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border text-foreground/40 hover:border-foreground/40 hover:text-foreground/60'
                      )}
                    >
                      {isStreaming ? (
                        <Square className="h-4 w-4" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Workspace tabs: configure / results / connections */
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Tab title bar */}
            <div className="border-border bg-background shrink-0 border-b px-6 py-3">
              <h2 className="text-foreground text-sm font-medium">
                {activeTab === 'configure' && 'Configurações'}
                {activeTab === 'results' && 'Resultados'}
                {activeTab === 'connections' && 'Integrações'}
              </h2>
            </div>
            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {activeTab === 'configure' && <ModuleList agentId={agentId} />}
              {activeTab === 'results' && <AgentResultsTab agentId={agentId} />}
              {activeTab === 'connections' && <AgentConnectionsTab agentId={agentId} />}
            </div>
          </div>
        )}

        {/* Right panel: artifact (conditional) */}
        {hasArtifact && (
          <div className="mr-3 mb-3 flex flex-1 flex-col overflow-hidden">
            <ArtifactPanel />
          </div>
        )}
      </div>
    </div>
  )
}

function TopbarButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
    >
      {icon}
    </button>
  )
}
