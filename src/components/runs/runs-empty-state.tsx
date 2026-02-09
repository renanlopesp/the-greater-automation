import Link from 'next/link'
import { Workflow, Mail, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const indicators = [
  { icon: Workflow, label: 'Automations', tone: 'primary' as const },
  { icon: Mail, label: 'Email', tone: 'secondary' as const },
  { icon: MessageSquare, label: 'Slack', tone: 'muted' as const },
]

export default function RunsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex flex-col items-center gap-3">
        {indicators.map((item) => (
          <div
            key={item.label}
            className={cn(
              'flex w-56 items-center gap-3 rounded-xl border px-4 py-3 backdrop-blur-sm',
              item.tone === 'primary' &&
                'border-primary/30 bg-background/60 ring-primary/15 shadow-sm ring-1',
              item.tone === 'secondary' &&
                'border-primary/20 bg-background/50 ring-primary/10 opacity-85 shadow-sm ring-1',
              item.tone === 'muted' && 'border-muted bg-background/35 opacity-55'
            )}
          >
            <item.icon
              className={cn(
                'h-4 w-4 shrink-0',
                item.tone === 'muted' ? 'text-muted-foreground/60' : 'text-primary/70'
              )}
            />
            <div
              className={cn(
                'h-0.5 flex-1 rounded-full',
                item.tone === 'muted' ? 'bg-muted' : 'bg-primary/25'
              )}
            />
            <div
              className={cn(
                'flex h-5 w-9 items-center rounded-full p-0.5',
                item.tone === 'muted' ? 'bg-muted/50' : 'bg-primary/15'
              )}
            >
              <div
                className={cn(
                  'h-4 w-4 rounded-full bg-white shadow-xs',
                  item.tone === 'muted' && 'opacity-70'
                )}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        No runs yet.{' '}
        <Link href="/workspace" className="text-primary underline underline-offset-2">
          View workflows
        </Link>
      </p>
    </div>
  )
}
