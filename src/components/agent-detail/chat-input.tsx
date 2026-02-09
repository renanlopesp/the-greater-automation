'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface ChatInputProps {
  agentName: string
}

export default function ChatInput({ agentName }: ChatInputProps) {
  const [message, setMessage] = useState('')

  function handleSubmit() {
    if (!message.trim()) return
    setMessage('')
  }

  return (
    <div className="border-border/60 border-t p-4">
      <Input
        placeholder={`Chat with ${agentName}...`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        className="border-border bg-background focus-visible:border-primary/40 h-12 rounded-2xl border px-4 shadow-sm focus-visible:ring-0"
      />
    </div>
  )
}
