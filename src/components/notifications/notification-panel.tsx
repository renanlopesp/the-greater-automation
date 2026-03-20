'use client'

import { CheckCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationItem, type OrchestratorNotification } from './notification-item'

interface NotificationPanelProps {
  notifications: OrchestratorNotification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClose: () => void
}

export function NotificationPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationPanelProps) {
  const unread = notifications.filter((n) => !n.is_read)
  const read = notifications.filter((n) => n.is_read)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="bg-background border-border absolute top-[calc(100%+8px)] right-0 z-50 flex w-[380px] flex-col overflow-hidden rounded-xl border shadow-lg">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm font-semibold">Notificações</span>
            {unread.length > 0 && (
              <span className="bg-foreground text-background flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                {unread.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground flex h-6 w-6 items-center justify-center rounded transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-1 py-10 text-sm">
              <span>Sem notificações</span>
            </div>
          ) : (
            <div className="divide-border divide-y">
              {unread.map((n) => (
                <NotificationItem key={n.id} notification={n} onMarkRead={onMarkRead} />
              ))}
              {read.length > 0 && (
                <>
                  {unread.length > 0 && (
                    <div className="bg-muted/20 px-4 py-1.5">
                      <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                        Lidas
                      </span>
                    </div>
                  )}
                  {read.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkRead={onMarkRead}
                      className={cn('opacity-60')}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {unread.length > 0 && (
          <div className="border-border border-t px-4 py-2.5">
            <button
              onClick={onMarkAllRead}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como lidas
            </button>
          </div>
        )}
      </div>
    </>
  )
}
