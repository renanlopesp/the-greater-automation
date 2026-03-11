'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { notifications as initialData, type Notification } from '@/data/notifications'
import NotificationCard from './notification-card'

export default function NotificationsClient() {
  const { t } = useLanguage()
  const [items, setItems] = useState<Notification[]>(initialData)

  const unread = items.filter((n) => !n.read)
  const read = items.filter((n) => n.read)

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-1 flex items-start justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              {t('notifications.title')}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('notifications.subtitle')}</p>
          </div>
          {unread.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-muted-foreground hover:text-foreground mt-1 shrink-0 text-xs font-medium transition-colors"
            >
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>

        {/* New section */}
        {unread.length > 0 && (
          <div className="mt-8">
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
              {t('notifications.new')} &middot; {unread.length}
            </h3>
            <div className="border-border bg-background divide-border divide-y overflow-hidden rounded-2xl border">
              {unread.map((n) => (
                <NotificationCard key={n.id} notification={n} onClick={() => markRead(n.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Earlier section */}
        {read.length > 0 && (
          <div className="mt-8">
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
              {t('notifications.earlier')}
            </h3>
            <div className="border-border bg-background divide-border divide-y overflow-hidden rounded-2xl border">
              {read.map((n) => (
                <NotificationCard key={n.id} notification={n} />
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground mt-3 text-sm">No notifications yet</p>
          </div>
        )}

        <div className="h-10" />
      </div>
    </div>
  )
}
