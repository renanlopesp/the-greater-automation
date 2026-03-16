'use client'

import { useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import ActivityCard, { type ActivityItem } from './activity-card'

interface ActivityLogProps {
  items: ActivityItem[]
}

export default function ActivityLog({ items }: ActivityLogProps) {
  const { t } = useLanguage()
  const [message, setMessage] = useState('')

  return (
    <div className="flex h-full flex-col">
      <div className="border-border shrink-0 border-b px-6 py-4">
        <h2 className="text-foreground text-lg font-medium">{t('agent.activityLog')}</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {items.map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
      </div>

      <div className="border-border shrink-0 border-t px-6 py-4">
        <div className="relative">
          <textarea
            placeholder="Ask the agent anything..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                setMessage('')
              }
            }}
            rows={1}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus:ring-ring min-h-[48px] w-full resize-none rounded-xl border py-3 pr-12 pl-4 text-sm focus:ring-2 focus:outline-none"
          />
          <button
            type="button"
            disabled={!message.trim()}
            className="bg-foreground text-background absolute top-1/2 right-3 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
