'use client'

import { useEffect } from 'react'
import { ChatContextProvider, useChatContext } from '@/contexts/chat-context'
import ChatHeader from '@/components/chat/chat-header'
import ChatLayout from '@/components/chat/chat-layout'
import ChatEmptyStateNew from '@/components/chat/chat-empty-state-new'
import ChatInput from '@/components/chat/chat-input'
import ChatMessage from '@/components/chat/chat-message'
import ContinueWith from '@/components/chat/chat-continue-with'
import TypingIndicator from '@/components/chat/typing-indicator'
import ArtifactPanelShell from '@/components/chat/artifact-panel-shell'
import DailySummaryArtifact from '@/components/chat/daily-summary-artifact'
import { useOrchestratorChat } from '@/hooks/use-orchestrator-chat'

interface ChatPageClientProps {
  initialConversationId: string | null
  initialMessages: Array<{ id: string; role: string; content: string }>
}

function getMessageText(m: { parts?: Array<{ type: string; text?: string }> }): string {
  return (
    m.parts
      ?.filter(
        (p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string'
      )
      .map((p) => p.text)
      .join('') ?? ''
  )
}

function ChatContent({ initialConversationId, initialMessages }: ChatPageClientProps) {
  const { setArtifactOpen, setChatTitle, artifactOpen } = useChatContext()

  const { messages, isLoading, sendMessage } = useOrchestratorChat({
    initialConversationId,
    initialMessages,
  })

  // Auto-open artifact with daily summary when there are no messages
  useEffect(() => {
    if (initialMessages.length === 0) {
      setArtifactOpen(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update title based on first assistant message
  useEffect(() => {
    const firstAssistant = messages.find((m) => m.role === 'assistant')
    if (firstAssistant) {
      const text = getMessageText(firstAssistant)
      if (text) {
        const title = text.slice(0, 40) + (text.length > 40 ? '...' : '')
        setChatTitle(title)
      }
    }
  }, [messages, setChatTitle])

  const handleSend = (text: string) => {
    sendMessage(text)
  }

  const hasMessages = messages.length > 0

  // Mock continue-with suggestions
  const lastMessage = messages[messages.length - 1]
  const showContinueWith = lastMessage?.role === 'assistant' && !isLoading
  const continueWithItems = [
    'Ver todas as 5 ações detalhadas',
    'Remarcar ação para amanhã',
    'Ver o que o Snew fez ontem',
  ]

  const chatContent = (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto" style={{ maxWidth: 680, padding: '32px 24px 16px' }}>
          {!hasMessages ? (
            <ChatEmptyStateNew onSendMessage={handleSend} />
          ) : (
            <>
              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  role={m.role as 'assistant' | 'user'}
                  content={getMessageText(m)}
                />
              ))}
              {isLoading && <TypingIndicator />}
              {showContinueWith && <ContinueWith items={continueWithItems} onSelect={handleSend} />}
            </>
          )}
        </div>
      </div>

      {/* Input pinned to bottom */}
      <div style={{ padding: '16px 24px' }}>
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  )

  const artifactContent = artifactOpen ? (
    <ArtifactPanelShell>
      <DailySummaryArtifact />
    </ArtifactPanelShell>
  ) : null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader />
      <div className="min-h-0 flex-1">
        <ChatLayout chatContent={chatContent} artifactContent={artifactContent} />
      </div>
    </div>
  )
}

export default function ChatPageClient(props: ChatPageClientProps) {
  return (
    <ChatContextProvider>
      <ChatContent {...props} />
    </ChatContextProvider>
  )
}
