'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
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
  canDelete?: boolean
}

export default function ConversationHistoryPanel({
  agentId,
  open,
  onOpenChange,
  onSelectConversation,
  onNewChat,
  canDelete = false,
}: ConversationHistoryPanelProps) {
  const {
    conversations,
    isLoading,
    switchConversation,
    isSwitching,
    deleteConversation,
    isDeleting,
  } = useConversationHistory(agentId)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleSelect(conversationId: string) {
    if (confirmDeleteId) return
    await switchConversation(conversationId)
    onSelectConversation(conversationId)
    onOpenChange(false)
  }

  async function handleDelete(conversationId: string) {
    await deleteConversation(conversationId)
    setConfirmDeleteId(null)
  }

  function handleNewChat() {
    onNewChat()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Histórico de Chat</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-2 px-4">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleNewChat}>
            <Plus className="size-4" />
            Novo Chat
          </Button>
        </div>
        <ScrollArea className="mt-4 h-[calc(100vh-10rem)]">
          <div className="flex flex-col gap-1 px-4">
            {isLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-muted h-16 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Nenhuma conversa ainda
              </p>
            ) : (
              conversations.map((conv) => (
                <div key={conv.id} className="relative">
                  {confirmDeleteId === conv.id ? (
                    <div className="bg-destructive/5 flex items-center justify-between gap-2 rounded-lg border border-red-200 px-3 py-2.5 dark:border-red-900">
                      <span className="text-sm">Excluir este chat?</span>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          disabled={isDeleting}
                          onClick={() => handleDelete(conv.id)}
                        >
                          {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group flex">
                      <button
                        type="button"
                        disabled={isSwitching}
                        onClick={() => handleSelect(conv.id)}
                        className={cn(
                          'hover:bg-accent flex min-w-0 flex-1 items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                          conv.isActive && 'bg-accent'
                        )}
                      >
                        <MessageSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="line-clamp-2 text-sm font-medium">
                              {conv.title ?? 'Conversa sem título'}
                            </span>
                            {conv.isActive && (
                              <span className="bg-primary/10 text-primary shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">
                                Ativo
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
                            <span>{conv.messageCount} mensagens</span>
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
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(conv.id)}
                          className="text-muted-foreground hover:text-destructive flex shrink-0 items-center px-2 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
