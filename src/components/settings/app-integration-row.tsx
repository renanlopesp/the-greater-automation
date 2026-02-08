import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { AppIntegration } from '@/lib/data/app-integrations'

interface AppIntegrationRowProps {
  app: AppIntegration
  onConnect: (appId: string) => void
}

export default function AppIntegrationRow({ app, onConnect }: AppIntegrationRowProps) {
  return (
    <div className="border-border flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          {app.iconSlug && (
            <AvatarImage src={`https://cdn.simpleicons.org/${app.iconSlug}`} alt={app.name} />
          )}
          <AvatarFallback className="text-xs font-medium">{app.name[0]}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{app.name}</span>
      </div>
      <Button
        variant={app.authType === 'google' ? 'outline' : 'default'}
        size="sm"
        onClick={() => onConnect(app.id)}
      >
        {app.authType === 'google' ? 'Sign in with Google' : 'Connect'}
      </Button>
    </div>
  )
}
