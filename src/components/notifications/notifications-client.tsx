'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NotificationCard, {
  type NotificationItem,
} from '@/components/notifications/notification-card'

const EXAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    category: 'sales',
    title: 'Daily sales report ready',
    description:
      'Your store had 24 orders today totaling R$3,450. Revenue is up 8% from yesterday.',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    category: 'inventory',
    title: '3 products running low',
    description: 'Camiseta Premium, Tênis Runner, and Mochila Urban are below reorder threshold.',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    category: 'workflow',
    title: 'Workflow "Abandoned Cart" completed',
    description: 'Successfully sent 12 recovery emails. 3 customers returned to complete purchase.',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    category: 'integration',
    title: 'Nuvemshop sync completed',
    description: 'All 156 products and 89 orders synced successfully.',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

interface NotificationsClientProps {
  notifications?: NotificationItem[]
}

export default function NotificationsClient({
  notifications: initialNotifications,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications ?? EXAMPLE_NOTIFICATIONS)

  const unread = notifications.filter((n) => !n.isRead)
  const read = notifications.filter((n) => n.isRead)

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pt-16 pb-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>
      <p className="text-muted-foreground mb-8 text-sm">Actions recommended by your agents</p>

      {unread.length > 0 && (
        <div className="mb-8 space-y-3">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            New
          </h3>
          {unread.map((n) => (
            <NotificationCard key={n.id} notification={n} onClick={() => markRead(n.id)} />
          ))}
        </div>
      )}

      {read.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Earlier
          </h3>
          {read.map((n) => (
            <NotificationCard key={n.id} notification={n} />
          ))}
        </div>
      )}

      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="text-muted-foreground size-10" />
          <p className="text-muted-foreground mt-3 text-sm">No notifications yet</p>
        </div>
      )}
    </div>
  )
}
