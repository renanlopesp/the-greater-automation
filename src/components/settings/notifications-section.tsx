'use client'

import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { useNotificationPreferences } from '@/hooks/use-notification-preferences'

const NOTIFICATION_OPTIONS = [
  {
    id: 'emailEnabled' as const,
    label: 'Notificações por e-mail',
    description: 'Receba notificações por e-mail sobre atualizações importantes',
  },
  {
    id: 'failuresEnabled' as const,
    label: 'Falhas em automações',
    description: 'Seja notificado quando uma automação falhar',
  },
  {
    id: 'digestEnabled' as const,
    label: 'Resumo semanal de atividades',
    description: 'Receba um resumo semanal das atividades do seu workspace',
  },
]

export default function NotificationsSection() {
  const { preferences, isLoading, updatePreference } = useNotificationPreferences()

  function handleToggle(id: 'emailEnabled' | 'failuresEnabled' | 'digestEnabled') {
    updatePreference(id, !preferences[id])
    toast('Preferência de notificação atualizada')
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-lg font-semibold">Notificações</h2>

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
