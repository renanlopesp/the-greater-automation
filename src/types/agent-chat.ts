export interface ChatSender {
  id: string
  fullName: string | null
  avatarUrl: string | null
}

export interface SharedChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  sender: ChatSender | null
  createdAt: string | null
  metadata: Record<string, unknown>
}

export interface ConversationSummary {
  id: string
  title: string | null
  createdBy: ChatSender | null
  createdAt: string | null
  updatedAt: string | null
  isActive: boolean
  messageCount: number
  participants: ChatSender[]
}
