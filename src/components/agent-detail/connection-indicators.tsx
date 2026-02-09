import { Globe, Mail, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ConnectionItem {
  label: string
  icon: ReactNode
  connected: boolean
}

const connections: ConnectionItem[] = [
  {
    label: 'Web browsing',
    icon: <Globe className="h-4 w-4" />,
    connected: false,
  },
  {
    label: 'Email',
    icon: <Mail className="h-4 w-4" />,
    connected: false,
  },
  {
    label: 'Slack',
    icon: <MessageSquare className="h-4 w-4" />,
    connected: false,
  },
]

export default function ConnectionIndicators() {
  return (
    <div className="flex flex-wrap gap-2">
      {connections.map((item) => (
        <div
          key={item.label}
          className={cn(
            'bg-background/70 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-sm',
            item.connected
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground'
          )}
        >
          {item.icon}
          <span>{item.label}</span>
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              item.connected ? 'bg-primary' : 'bg-muted-foreground/40'
            )}
          />
        </div>
      ))}
    </div>
  )
}
