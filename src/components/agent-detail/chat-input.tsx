'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="border-t p-4">
      <div className="flex gap-2">
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
        />
        <Button size="icon" disabled={!message.trim()} onClick={handleSubmit}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
