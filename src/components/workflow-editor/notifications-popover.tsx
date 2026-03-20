'use client'

import { Bell } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications, useUnreadNotificationCount } from '@/hooks/use-notifications'
import { formatRelativeTime } from '@/lib/utils/format-relative-time'

interface NotificationsPopoverProps {
  children: React.ReactNode
}

export default function NotificationsPopover({ children }: NotificationsPopoverProps) {
  const { notifications, isLoading, markAsRead, markAllAsRead, isMarkingAllRead } =
    useNotifications()
  const { count: unreadCount } = useUnreadNotificationCount()

  const handleNotificationClick = (notificationId: string, is_read: boolean) => {
    if (!is_read) {
      markAsRead(notificationId)
    }
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative">
          {children}
          {unreadCount > 0 && (
            <span className="bg-destructive absolute top-0 right-0 h-2 w-2 rounded-full" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Notificações</h4>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
              >
                Marcar todas como lidas
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-md border p-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="text-muted-foreground mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                  className={`hover:bg-accent/30 w-full rounded-md border p-3 text-left text-sm transition-colors ${!notification.is_read ? 'bg-accent/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-muted-foreground mt-1 text-xs">{notification.body}</div>
                      <div className="text-muted-foreground mt-2 text-xs">
                        {formatRelativeTime(notification.created_at ?? '')}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="bg-primary mt-1 h-2 w-2 flex-shrink-0 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
