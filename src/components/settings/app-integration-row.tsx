import Image from 'next/image'
import { Linkedin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ComposioApp } from '@/lib/composio/actions/get-composio-apps'

// LinkedIn was removed from SimpleIcons — use Lucide fallback
const SIMPLEICONS_UNAVAILABLE = new Set(['linkedin', 'nuvemshop'])

interface AppIntegrationRowProps {
  app: ComposioApp
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
        {app.logoUrl ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-1 dark:bg-white/90">
            <Image
              src={app.logoUrl}
              alt={app.name}
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
              unoptimized
            />
          </div>
        ) : app.iconSlug && !SIMPLEICONS_UNAVAILABLE.has(app.iconSlug) ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-1 dark:bg-white/90">
            <Image
              src={`https://cdn.simpleicons.org/${app.iconSlug}/black`}
              alt={app.name}
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
              unoptimized
            />
          </div>
        ) : app.iconSlug === 'linkedin' ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-1 dark:bg-white/90">
            <Linkedin className="h-6 w-6 text-black" />
          </div>
        ) : (
          <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium">
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
          <Button variant="default" size="sm" onClick={() => onConnect(app.id)}>
            Connect
          </Button>
        )}
      </div>
    </div>
  )
}
