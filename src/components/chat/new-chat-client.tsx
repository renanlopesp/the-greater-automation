'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const SUGGESTION_CARDS = [
  { title: 'Check my sales', description: "Get a summary of today's sales performance" },
  { title: 'Create a workflow', description: 'Automate a repetitive task step by step' },
  { title: 'Analyze inventory', description: 'Find products that need restocking' },
  { title: 'Review orders', description: 'Check pending and recent orders' },
]

interface NewChatClientProps {
  orchestratorId: string | null
}

export default function NewChatClient({ orchestratorId }: NewChatClientProps) {
  const [message, setMessage] = useState('')
  const router = useRouter()

  function handleSend(text?: string) {
    const msg = text ?? message
    if (!msg.trim() || !orchestratorId) return
    const encoded = encodeURIComponent(msg.trim())
    router.push(`/agents/${orchestratorId}?message=${encoded}`)
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="bg-foreground text-background flex h-10 w-10 items-center justify-center rounded-full">
          <Bot className="size-5" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">What can I help you with?</h2>
        <p className="text-muted-foreground mt-1 max-w-md text-center text-sm">
          Ask me anything about your store, create automations, or get insights about your business.
        </p>
        <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-3">
          {SUGGESTION_CARDS.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={() => handleSend(card.title)}
              className="hover:bg-accent rounded-xl border p-4 text-left transition-colors"
            >
              <p className="text-sm font-medium">{card.title}</p>
              <p className="text-muted-foreground mt-1 text-xs">{card.description}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-background sticky bottom-0 border-t p-4">
        <div className="relative mx-auto max-w-lg">
          <Textarea
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            className="min-h-[56px] resize-none rounded-xl pr-12"
            rows={1}
          />
          <Button
            size="icon"
            className="absolute right-3 bottom-3 h-8 w-8 rounded-lg"
            onClick={() => handleSend()}
            disabled={!message.trim() || !orchestratorId}
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
