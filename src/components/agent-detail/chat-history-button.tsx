'use client'

import { useState } from 'react'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import ConversationHistoryPanel from './conversation-history-panel'
import { triggerNewChat } from './chat-panel'

export default function ChatHistoryButton({
  agentId,
  canDelete = false,
}: {
  agentId: string
  canDelete?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
            <History className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Histórico de chat</TooltipContent>
      </Tooltip>
      <ConversationHistoryPanel
        agentId={agentId}
        open={open}
        onOpenChange={setOpen}
        onSelectConversation={() => {
          // Conversation switch happens via API + Realtime — chat panel will auto-reload
          window.location.reload()
        }}
        onNewChat={() => {
          triggerNewChat()
        }}
        canDelete={canDelete}
      />
    </>
  )
}
