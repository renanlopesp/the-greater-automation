'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { triggerNewChat } from '@/components/agent-detail/chat-panel'

export default function NewChatButton() {
  return (
    <Button variant="ghost" size="icon-sm" onClick={() => triggerNewChat()}>
      <Plus className="h-4 w-4" />
    </Button>
  )
}
