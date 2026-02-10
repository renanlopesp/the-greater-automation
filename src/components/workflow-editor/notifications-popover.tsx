'use client'

import { Bell } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Notification {
  id: string
  title: string
  message: string
  timestamp: string
  read: boolean
}

// Mock data for now
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Workflow published',
    message: 'Your workflow "Send welcome email" was published successfully.',
    timestamp: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    title: 'Workflow run completed',
    message: 'Workflow "Daily report" completed with 15 successful steps.',
    timestamp: '5 hours ago',
    read: true,
  },
]

interface NotificationsPopoverProps {
  children: React.ReactNode
}

export default function NotificationsPopover({ children }: NotificationsPopoverProps) {
  const unreadCount = mockNotifications.filter((n) => !n.read).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative">
          {children}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {mockNotifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                Mark all as read
              </Button>
            )}
          </div>

          {mockNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="text-muted-foreground mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mockNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-md border p-3 text-sm ${!notification.read ? 'bg-accent/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {notification.message}
                      </div>
                      <div className="text-muted-foreground mt-2 text-xs">
                        {notification.timestamp}
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="bg-primary mt-1 h-2 w-2 flex-shrink-0 rounded-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
