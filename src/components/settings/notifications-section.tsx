'use client'

import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { useNotificationPreferences } from '@/hooks/use-notification-preferences'

const NOTIFICATION_OPTIONS = [
  {
    id: 'emailEnabled' as const,
    label: 'Email notifications',
    description: 'Receive email notifications for important updates',
  },
  {
    id: 'failuresEnabled' as const,
    label: 'Workflow run failures',
    description: 'Get notified when a workflow run fails',
  },
  {
    id: 'digestEnabled' as const,
    label: 'Weekly activity digest',
    description: 'Receive a weekly summary of your workspace activity',
  },
]

export default function NotificationsSection() {
  const { preferences, isLoading, updatePreference } = useNotificationPreferences()

  function handleToggle(id: 'emailEnabled' | 'failuresEnabled' | 'digestEnabled') {
    updatePreference(id, !preferences[id])
    toast('Notification preference updated')
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-lg font-semibold">Notifications</h2>

      <div className="flex flex-col gap-4">
        {NOTIFICATION_OPTIONS.map((opt) => (
          <div key={opt.id} className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-muted-foreground text-sm">{opt.description}</span>
            </div>
            <Switch
              checked={preferences[opt.id]}
              onCheckedChange={() => handleToggle(opt.id)}
              disabled={isLoading}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
