'use client'

import { ArrowLeft, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/language-context'
import { conversations } from '@/data/conversations'
import MessageThread from './message-thread'
import ChatInputBar from './chat-input-bar'

const actionChips = ['Draft email sequence', 'Export segment', 'Schedule campaign', 'Set reminder']

interface ChatViewClientProps {
  chatId: string
}

export default function ChatViewClient({ chatId }: ChatViewClientProps) {
  const { t } = useLanguage()
  const conversation = conversations.find((c) => c.id === chatId) ?? conversations[0]

  const handleSend = (message: string) => {
    console.log('Send:', message)
  }

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
        <Link
          href="/history"
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Link>
        <h2 className="text-foreground max-w-[50%] truncate text-sm font-medium">
          {conversation.title}
        </h2>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <MessageThread messages={conversation.messages} />

      {/* Action chips */}
      <div className="border-border shrink-0 border-t px-6 py-3">
        <div className="scrollbar-none flex items-center gap-2 overflow-x-auto">
          {actionChips.map((chip) => (
            <button
              key={chip}
              className="bg-muted text-muted-foreground hover:text-foreground shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <ChatInputBar onSend={handleSend} />
    </div>
  )
}
