'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { triggerNewChat } from '@/components/agent-detail/chat-panel'

export default function NewChatButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="default" size="icon-sm" onClick={() => triggerNewChat()}>
          <Plus className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>New chat</TooltipContent>
    </Tooltip>
  )
}
