import Image from 'next/image'
import { Linkedin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AppIntegration } from '@/lib/data/app-integrations'

// LinkedIn was removed from SimpleIcons — use Lucide fallback
const SIMPLEICONS_UNAVAILABLE = new Set(['linkedin'])

interface AppIntegrationRowProps {
  app: AppIntegration
  isConnected?: boolean
  accountLabel?: string | null
  onConnect: (appId: string) => void
  onDisconnect?: (appId: string) => void
}

export default function AppIntegrationRow({
  app,
  isConnected = false,
  accountLabel,
  onConnect,
  onDisconnect,
}: AppIntegrationRowProps) {
  return (
    <div className="border-border flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        {app.iconSlug && !SIMPLEICONS_UNAVAILABLE.has(app.iconSlug) ? (
          <Image
            src={`https://cdn.simpleicons.org/${app.iconSlug}/white`}
            alt={app.name}
            width={28}
            height={28}
            className="h-7 w-7"
            unoptimized
          />
        ) : app.iconSlug === 'linkedin' ? (
          <Linkedin className="h-7 w-7" />
        ) : (
          <div className="bg-muted flex h-7 w-7 items-center justify-center rounded text-xs font-medium">
            {app.name[0]}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium">{app.name}</span>
          {isConnected && accountLabel && (
            <span className="text-muted-foreground text-xs">{accountLabel}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isConnected && (
          <Badge variant="outline" className="border-green-600 bg-green-50 text-green-700">
            Connected
          </Badge>
        )}
        {isConnected ? (
          <Button variant="destructive" size="sm" onClick={() => onDisconnect?.(app.id)}>
            Disconnect
          </Button>
        ) : (
          <Button
            variant={app.authType === 'google' ? 'outline' : 'default'}
            size="sm"
            onClick={() => onConnect(app.id)}
          >
            {app.authType === 'google' ? 'Sign in with Google' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  )
}
