'use client'

import { useCallback, useState } from 'react'
import { Clock, Copy, Plug, SlidersHorizontal, ArrowUp, Square } from 'lucide-react'
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
import { isTextUIPart } from 'ai'
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

  const handleSuggestion = useCallback(
    (text: string) => {
      sendMessage(text)
    },
    [sendMessage]
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Topbar */}
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        {/* Left: avatar + name */}
        <div className="flex items-center gap-2.5">
          <CoworkerAvatar src={agentAvatarSrc} name={agentName} size="xs" />
          <span className="text-foreground text-sm font-medium">{agentName}</span>
        </div>

        {/* Right: icon buttons */}
        <div className="flex items-center gap-1">
          <TopbarButton
            icon={<Clock className="h-4 w-4" />}
            title="Histórico"
            onClick={() => setActiveTab('activity')}
          />
          <TopbarButton
            icon={<Copy className="h-4 w-4" />}
            title="Arquivos"
            onClick={() => setActiveTab('results')}
          />
          <TopbarButton
            icon={<Plug className="h-4 w-4" />}
            title="Integrações"
            onClick={() => setActiveTab('connections')}
          />
          <TopbarButton
            icon={<SlidersHorizontal className="h-4 w-4" />}
            title="Configurações"
            onClick={() => setActiveTab('configure')}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Chat+activity OR workspace tabs */}
        {activeTab === 'activity' ? (
          <div
            className={cn(
              'flex flex-col overflow-hidden transition-all',
              hasArtifact ? 'border-border w-[520px] shrink-0 border-r' : 'flex-1'
            )}
          >
            {/* Scrollable area: activity feed + chat messages */}
            <Conversation className="flex-1">
              <ConversationContent className="mx-auto max-w-2xl px-6 pt-5 pb-6">
                {/* Activity feed — always at top */}
                <AgentActivityFeed
                  agentId={agentId}
                  agentName={agentName}
                  agentAvatarSrc={agentAvatarSrc}
                />

                {/* Chat messages below activity */}
                {visibleMessages.map((message) => {
                  const isUser = message.role === 'user'
                  const textContent = (message.parts ?? [])
                    .filter(isTextUIPart)
                    .map((p) => p.text)
                    .join('')

                  return (
                    <Message key={message.id} from={message.role as 'user' | 'assistant'}>
                      {!isUser && (
                        <div className="mb-1 flex items-center gap-2">
                          <BoringAvatar
                            name={agentName}
                            variant="bauhaus"
                            size={20}
                            colors={getAgentPalette(agentPalette)}
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
                          <MessageResponse>{textContent}</MessageResponse>
                        )}
                      </MessageContent>
                    </Message>
                  )
                })}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            {/* Chat input — fixed at bottom of card */}
            <div className="shrink-0 px-5 pt-2 pb-5">
              <div className="mx-auto max-w-2xl">
                {/* Textarea box */}
                <div className="[&_[data-slot=input-group]]:border-border [&_[data-slot=input-group]]:bg-muted/40 [&_[data-slot=input-group]]:focus-within:border-foreground/30 [&_[data-slot=input-group]]:focus-within:bg-background [&_[data-slot=input-group]]:rounded-2xl [&_[data-slot=input-group]]:shadow-sm [&_[data-slot=input-group]]:transition-all">
                  <PromptInput onSubmit={handleSubmit}>
                    <PromptInputTextarea
                      placeholder={`Message ${agentName}...`}
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
                          <Square className="size-4" />
                        ) : (
                          <ArrowUp className="size-4" />
                        )}
                      </PromptInputSubmit>
                    </PromptInputFooter>
                  </PromptInput>
                </div>

                {/* Suggestion pills — below textarea, wrapping */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGESTION_PILLS.map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => handleSuggestion(pill)}
                      className="border-border bg-background text-muted-foreground hover:text-foreground/80 hover:border-foreground/20 hover:bg-muted/60 rounded-full border px-3 py-1.5 text-[11px] whitespace-nowrap transition-all"
                    >
                      {pill}
                    </button>
                  ))}
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
