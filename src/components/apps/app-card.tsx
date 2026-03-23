import { ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppDef {
  slug: string
  name: string
  emoji: string
  description: string
}

interface AppCardProps {
  app: AppDef
  connected?: boolean
}

export default function AppCard({ app, connected }: AppCardProps) {
  return (
    <div
      className={cn(
        'group border-border bg-background hover:border-foreground/25 flex cursor-pointer items-center gap-4 rounded-xl border p-5 transition-colors'
      )}
    >
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl">
        {app.emoji}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm leading-snug font-medium">{app.name}</p>
        <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">{app.description}</p>
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-2">
        {connected && (
          <span
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--green)' }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected
          </span>
        )}
        <ChevronRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-colors" />
      </div>
    </div>
  )
}
