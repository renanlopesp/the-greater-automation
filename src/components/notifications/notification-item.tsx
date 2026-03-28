'use client'

import { cn } from '@/lib/utils'

export interface OrchestratorNotification {
  id: string
  urgency: 'urgent' | 'opportunity' | 'insight'
  title: string
  body: string | null
  cta_url: string | null
  is_read: boolean
  created_at: string
  source_agent?: { id: string; name: string } | null
}

const urgencyBorderColor: Record<OrchestratorNotification['urgency'], string> = {
  urgent: 'border-l-red-500',
  opportunity: 'border-l-yellow-500',
  insight: 'border-l-blue-500',
}

const urgencyLabel: Record<OrchestratorNotification['urgency'], string> = {
  urgent: 'Urgente',
  opportunity: 'Oportunidade',
  insight: 'Insight',
}

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}m`
  if (diffH < 24) return `${diffH}h`
  return `${diffD}d`
}

interface NotificationItemProps {
  notification: OrchestratorNotification
  onMarkRead: (id: string) => void
  className?: string
}

export function NotificationItem({ notification, onMarkRead, className }: NotificationItemProps) {
  return (
    <div
      className={cn(
        'flex cursor-pointer gap-0 border-l-4 transition-colors',
        urgencyBorderColor[notification.urgency],
        notification.is_read ? 'bg-muted/30 hover:bg-muted/50' : 'bg-background hover:bg-muted/30',
        className
      )}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3">
        <div className="flex items-center gap-2">
          {!notification.is_read && (
            <span className="bg-foreground h-1.5 w-1.5 shrink-0 rounded-full" />
          )}
          <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            {urgencyLabel[notification.urgency]}
          </span>
          {notification.source_agent && (
            <>
              <span className="text-muted-foreground text-[10px]">·</span>
              <span className="text-muted-foreground truncate text-[10px]">
                {notification.source_agent.name}
              </span>
            </>
          )}
        </div>
        <p
          className={cn(
            'text-sm leading-snug',
            notification.is_read ? 'text-foreground/70' : 'text-foreground font-medium'
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-muted-foreground line-clamp-2 text-[12px] leading-relaxed">
            {notification.body}
          </p>
        )}
        {notification.cta_url &&
          (() => {
            try {
              const parsed = new URL(notification.cta_url, window.location.origin)
              return ['http:', 'https:'].includes(parsed.protocol)
            } catch {
              return false
            }
          })() && (
            <a
              href={notification.cta_url}
              onClick={(e) => e.stopPropagation()}
              className="text-foreground/70 hover:text-foreground mt-1 w-fit text-[11px] underline underline-offset-2 transition-colors"
            >
              Ver detalhes
            </a>
          )}
      </div>
      <span className="text-muted-foreground mt-3 mr-3 shrink-0 text-[10px]">
        {timeAgo(notification.created_at)}
      </span>
    </div>
  )
}
