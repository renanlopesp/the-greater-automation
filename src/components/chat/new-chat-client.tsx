'use client'

import ChatEmptyState from './chat-empty-state'
import ChatInputBar from './chat-input-bar'
import type { CoworkerItem } from './coworker-selector'

interface NewChatClientProps {
  agents?: CoworkerItem[]
}

export default function NewChatClient({ agents }: NewChatClientProps) {
  const handleSend = (message: string) => {
    // TODO: integrate with real chat backend
    console.log('Send:', message)
  }

  return (
    <div className="bg-background flex h-full flex-col">
      <ChatEmptyState onSelectPrompt={handleSend} />
      <ChatInputBar onSend={handleSend} coworkers={agents} />
    </div>
  )
}
