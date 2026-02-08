'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

const NOTIFICATION_OPTIONS = [
  {
    id: 'email',
    label: 'Email notifications',
    description: 'Receive email notifications for important updates',
  },
  {
    id: 'failures',
    label: 'Workflow run failures',
    description: 'Get notified when a workflow run fails',
  },
  {
    id: 'digest',
    label: 'Weekly activity digest',
    description: 'Receive a weekly summary of your workspace activity',
  },
]

export default function NotificationsSection() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    email: true,
    failures: true,
    digest: true,
  })

  function handleToggle(id: string) {
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }))
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
            <Switch checked={prefs[opt.id]} onCheckedChange={() => handleToggle(opt.id)} />
          </div>
        ))}
      </div>
    </div>
  )
}
