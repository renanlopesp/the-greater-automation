'use client'

import { cn } from '@/lib/utils'
import { categoryColors, type Notification } from '@/data/notifications'

interface NotificationCardProps {
  notification: Notification
  onClick?: () => void
}

export default function NotificationCard({ notification, onClick }: NotificationCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'hover:bg-muted/40 flex cursor-pointer items-start gap-4 p-5 transition-colors',
        !notification.read && 'bg-muted/20'
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2.5">
          {!notification.read && <span className="bg-foreground h-2 w-2 shrink-0 rounded-full" />}
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
              categoryColors[notification.category]
            )}
          >
            {notification.category}
          </span>
        </div>
        <p
          className={cn(
            'text-sm leading-snug',
            notification.read ? 'text-foreground' : 'text-foreground font-medium'
          )}
        >
          {notification.title}
        </p>
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          {notification.description}
        </p>
      </div>
      <span className="text-muted-foreground mt-1 shrink-0 text-[11px]">
        {notification.timestamp}
      </span>
    </div>
  )
}
