'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useActivityFeed } from '@/hooks/use-activity-feed'
import { cn } from '@/lib/utils'

export default function ActivityFeed() {
  const router = useRouter()
  const { items } = useActivityFeed()

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 animate-pulse rounded-full"
            style={{ background: 'var(--green)' }}
          />
          <span className="text-foreground text-[13px] font-medium">Activity</span>
        </div>
        <Link
          href="/chat"
          className="text-muted-foreground hover:text-foreground text-[11px] transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* List */}
      <div>
        {items.map((item) => (
          <div
            key={item.id}
            className="border-border flex items-center gap-3 border-b py-2.5 last:border-b-0"
          >
            {/* Icon */}
            {item.kind === 'attention' ? (
              <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: 'var(--amber)' }} />
            ) : (
              <Loader2 className="text-muted-foreground h-3 w-3 shrink-0 animate-spin" />
            )}

            {/* Text */}
            <span className="text-foreground min-w-0 flex-1 truncate text-[13px]">{item.text}</span>

            {/* Right side */}
            {item.action && item.route ? (
              <button
                onClick={() => router.push(item.route!)}
                className={cn(
                  'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                  'shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors'
                )}
              >
                {item.action}
              </button>
            ) : (
              <span className="text-muted-foreground shrink-0 text-[11px]">{item.meta}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
