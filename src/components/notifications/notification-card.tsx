import { cn } from '@/lib/utils'

const CATEGORY_STYLES: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  inventory: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  workflow: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  integration: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  general: 'bg-muted text-muted-foreground',
}

export interface NotificationItem {
  id: string
  category: string
  title: string
  description: string
  isRead: boolean
  createdAt: string
}

interface NotificationCardProps {
  notification: NotificationItem
  onClick?: () => void
}

export default function NotificationCard({ notification, onClick }: NotificationCardProps) {
  const categoryStyle = CATEGORY_STYLES[notification.category] ?? CATEGORY_STYLES.general

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'hover:bg-accent flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
        !notification.isRead && 'bg-accent/50'
      )}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
              categoryStyle
            )}
          >
            {notification.category}
          </span>
          {!notification.isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
        </div>
        <p className={cn('text-sm', !notification.isRead && 'font-medium')}>{notification.title}</p>
        <p className="text-muted-foreground text-xs">{notification.description}</p>
      </div>
    </button>
  )
}
