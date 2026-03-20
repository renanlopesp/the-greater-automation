'use client'

import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  count: number
  hasUrgent?: boolean
  onClick: () => void
}

export function NotificationBadge({ count, hasUrgent, onClick }: NotificationBadgeProps) {
  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center"
      aria-label={`${count} unread notification${count !== 1 ? 's' : ''}`}
    >
      <span
        className={cn(
          'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white',
          hasUrgent ? 'bg-red-500' : 'bg-foreground',
          hasUrgent && 'animate-pulse'
        )}
      >
        {count > 99 ? '99+' : count}
      </span>
    </button>
  )
}
