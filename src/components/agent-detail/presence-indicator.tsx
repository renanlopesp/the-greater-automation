'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAgentPresence } from '@/hooks/use-agent-presence'

interface PresenceIndicatorProps {
  agentId: string
  currentUser: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  }
}

export default function PresenceIndicator({ agentId, currentUser }: PresenceIndicatorProps) {
  const { activeUsers } = useAgentPresence(agentId, currentUser)

  if (activeUsers.length === 0) return null

  return (
    <div className="mr-1.5 flex items-center gap-1">
      <div className="flex -space-x-1.5">
        {activeUsers.slice(0, 3).map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <Avatar className="ring-background size-6 ring-2">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {user.fullName?.[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{user.fullName ?? 'Team member'}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      {activeUsers.length > 3 && (
        <span className="text-muted-foreground text-xs">+{activeUsers.length - 3}</span>
      )}
    </div>
  )
}
