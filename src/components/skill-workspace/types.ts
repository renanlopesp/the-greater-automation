import type { ReactNode } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  snippetCard?: ReactNode
  followUps?: ReactNode
}
