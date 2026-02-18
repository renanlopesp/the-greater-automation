'use client'

import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Plus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useConversationHistory } from '@/hooks/use-conversation-history'
import { cn } from '@/lib/utils'

interface ConversationHistoryPanelProps {
  agentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectConversation: (conversationId: string) => void
  onNewChat: () => void
}

export default function ConversationHistoryPanel({
  agentId,
  open,
  onOpenChange,
  onSelectConversation,
  onNewChat,
}: ConversationHistoryPanelProps) {
  const { conversations, isLoading, switchConversation, isSwitching } =
    useConversationHistory(agentId)

  async function handleSelect(conversationId: string) {
    await switchConversation(conversationId)
    onSelectConversation(conversationId)
    onOpenChange(false)
  }

  function handleNewChat() {
    onNewChat()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Chat History</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleNewChat}>
            <Plus className="size-4" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="mt-4 h-[calc(100vh-10rem)]">
          <div className="flex flex-col gap-1">
            {isLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-muted h-16 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  disabled={isSwitching}
                  onClick={() => handleSelect(conv.id)}
                  className={cn(
                    'hover:bg-accent flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    conv.isActive && 'bg-accent'
                  )}
                >
                  <MessageSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {conv.title ?? 'Untitled conversation'}
                      </span>
                      {conv.isActive && (
                        <span className="bg-primary/10 text-primary shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                      {conv.updatedAt && (
                        <span>
                          {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                        </span>
                      )}
                      <span>·</span>
                      <span>{conv.messageCount} messages</span>
                    </div>
                    {conv.participants.length > 0 && (
                      <div className="mt-1.5 flex -space-x-1.5">
                        {conv.participants.slice(0, 4).map((p) => (
                          <Avatar
                            key={p.id}
                            className="size-5 border-2 border-white dark:border-zinc-900"
                          >
                            <AvatarImage src={p.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-[8px]">
                              {p.fullName?.[0]?.toUpperCase() ?? '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {conv.participants.length > 4 && (
                          <span className="text-muted-foreground ml-1 self-center text-[10px]">
                            +{conv.participants.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
