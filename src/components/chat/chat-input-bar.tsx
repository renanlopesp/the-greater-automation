'use client'

import { useState } from 'react'
import { Plus, Mic, ArrowUp } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import CoworkerSelector, { type CoworkerItem } from './coworker-selector'

interface ChatInputBarProps {
  onSend: (message: string) => void
  coworkers?: CoworkerItem[]
}

export default function ChatInputBar({ onSend, coworkers }: ChatInputBarProps) {
  const { t } = useLanguage()
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (!message.trim()) return
    onSend(message.trim())
    setMessage('')
  }

  return (
    <div className="bg-background border-border sticky bottom-0 border-t px-4 py-4">
      <div className="mx-auto max-w-2xl space-y-3">
        <CoworkerSelector coworkers={coworkers} />
        <div className="relative">
          <textarea
            placeholder={t('chat.inputPlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={1}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus:ring-ring min-h-[48px] w-full resize-none rounded-xl border py-3 pr-20 pl-12 text-sm focus:ring-2 focus:outline-none"
          />
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-foreground text-background flex h-7 w-7 items-center justify-center rounded-lg transition-opacity disabled:opacity-40"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
