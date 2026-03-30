'use client'

import { ChatContextProvider, useChatContext } from '@/contexts/chat-context'
import ChatHeader from '@/components/chat/chat-header'
import ChatLayout from '@/components/chat/chat-layout'
import ArtifactPanelShell from '@/components/chat/artifact-panel-shell'
import DailySummaryArtifact from '@/components/chat/daily-summary-artifact'
import OrchestratorChatWrapper from '@/components/chat/orchestrator-chat-wrapper'

interface ChatPageClientProps {
  initialConversationId: string | null
  initialMessages: Array<{ id: string; role: string; content: string }>
  initialQuery?: string
}

function ChatContentWithLayout({
  initialConversationId,
  initialMessages,
  initialQuery,
}: ChatPageClientProps) {
  const { artifactOpen } = useChatContext()

  const chatContent = (
    <OrchestratorChatWrapper
      initialConversationId={initialConversationId}
      initialMessages={initialMessages}
      initialQuery={initialQuery}
    />
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
      <ChatContentWithLayout {...props} />
    </ChatContextProvider>
  )
}
