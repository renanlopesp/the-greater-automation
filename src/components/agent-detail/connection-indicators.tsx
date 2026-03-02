import { cn } from '@/lib/utils'

interface ConnectedApp {
  app_id: string
  account_label: string | null
}

interface ConnectionIndicatorsProps {
  apps: ConnectedApp[]
}

const APP_ICONS: Record<string, string> = {
  github: '🐙',
  slack: '💬',
  gmail: '📧',
  notion: '📝',
  linear: '📊',
  asana: '✓',
  trello: '📋',
  google_calendar: '📅',
  zoom: '🎥',
  dropbox: '📦',
  shopify: '🛒',
  nuvemshop: '☁️',
  mercadolivre: '🤝',
}

function formatAppName(appId: string): string {
  // Replace underscores and hyphens with spaces, capitalize words
  return appId
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function ConnectionIndicators({ apps }: ConnectionIndicatorsProps) {
  if (apps.length === 0) {
    return <p className="text-muted-foreground text-xs">Nenhum aplicativo conectado</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {apps.map((app) => (
        <div
          key={app.app_id}
          className={cn(
            'border-primary/30 bg-primary/10 text-primary flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs'
          )}
        >
          <span>{APP_ICONS[app.app_id] ?? '⚡'}</span>
          <span>{app.account_label ?? formatAppName(app.app_id)}</span>
          <span className="bg-primary h-2 w-2 rounded-full" />
        </div>
      ))}
    </div>
  )
}
