'use client'

import { ChatContextProvider } from '@/contexts/chat-context'
import ChatHeader from '@/components/chat/chat-header'
import ChatLayout from '@/components/chat/chat-layout'
import ArtifactPanelShell from '@/components/chat/artifact-panel-shell'
import DailySummaryArtifact from '@/components/chat/daily-summary-artifact'
import OrchestratorChatWrapper from '@/components/chat/orchestrator-chat-wrapper'
import { MoreHorizontal } from 'lucide-react'

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
  const chatContent = (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        <OrchestratorChatWrapper
          initialConversationId={initialConversationId}
          initialMessages={initialMessages}
          initialQuery={initialQuery}
        />
      </div>
    </div>
  )

  const artifactContent = (
    <div className="flex h-full flex-col">
      {/* Artifact top bar — aligned with chat header height */}
      <div className="flex shrink-0 items-center justify-end px-4" style={{ height: 48 }}>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground hover:bg-background/50 flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ArtifactPanelShell>
          <DailySummaryArtifact />
        </ArtifactPanelShell>
      </div>
    </div>
  )

  return <ChatLayout chatContent={chatContent} artifactContent={artifactContent} />
}

export default function ChatPageClient(props: ChatPageClientProps) {
  return (
    <ChatContextProvider>
      <ChatContentWithLayout {...props} />
    </ChatContextProvider>
  )
}
