'use client'

import { useCallback, useState } from 'react'
import { Clock, Copy, Plug, SlidersHorizontal, ArrowUp, Square } from 'lucide-react'
import CoworkerAvatar from '@/components/coworker-avatar'
import { useAgentWorkspaceStore } from '@/stores/agent-workspace-store'
import { useAgentChat } from '@/hooks/use-agent-chat'
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
  agentAvatarSrc,
  teamId,
  currentUserId,
  initialConversationId,
  initialMessages,
}: InstalledAgentPageProps) {
  const { setActiveTab, activeTab, selectedArtifactId } = useAgentWorkspaceStore()
  const hasArtifact = !!selectedArtifactId

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
      <div className="border-border bg-background flex shrink-0 items-center justify-between border-b px-4 py-2">
        {/* Left: avatar + name */}
        <div className="flex items-center gap-2">
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

      {/* Main panels */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left panel: chat+activity OR workspace tabs */}
        {activeTab === 'activity' ? (
          <div
            className={cn(
              'border-border flex flex-col overflow-hidden transition-all',
              hasArtifact ? 'w-[420px] shrink-0 border-r' : 'flex-1'
            )}
          >
            {/* Scrollable area: activity feed + chat messages */}
            <Conversation className="flex-1">
              <ConversationContent className="mx-auto max-w-xl">
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
                            size={28}
                            colors={getAgentPalette(agentPalette)}
                          />
                          <span className="text-muted-foreground text-sm font-medium">
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

            {/* Chat input — fixed at bottom */}
            <div className="bg-background shrink-0 px-4 py-3">
              <div className="mx-auto max-w-xl">
                {/* Suggestion pills */}
                <div className="scrollbar-none mb-2 flex gap-2 overflow-x-auto pb-1">
                  {SUGGESTION_PILLS.map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => handleSuggestion(pill)}
                      className="border-border text-muted-foreground hover:text-foreground shrink-0 rounded-full border px-3 py-1 text-xs transition-colors"
                    >
                      {pill}
                    </button>
                  ))}
                </div>

                <div className="[&_[data-slot=input-group]]:border-border [&_[data-slot=input-group]]:bg-muted/40 [&_[data-slot=input-group]]:rounded-2xl [&_[data-slot=input-group]]:shadow-none">
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
        {hasArtifact && <ArtifactPanel />}
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
      className="hover:bg-muted text-muted-foreground rounded-md p-1.5 transition-colors"
    >
      {icon}
    </button>
  )
}
