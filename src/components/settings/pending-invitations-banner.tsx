'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { acceptInvitationAction, declineInvitationAction } from '@/lib/actions/members'
import { toast } from 'sonner'
import type { TeamInvitation } from '@/types/navigation'

interface PendingInvitationsBannerProps {
  invitations: (TeamInvitation & { teamName: string })[]
}

export default function PendingInvitationsBanner({ invitations }: PendingInvitationsBannerProps) {
  const [isPending, startTransition] = useTransition()

  if (invitations.length === 0) return null

  function handleAccept(invitationId: string) {
    startTransition(async () => {
      const result = await acceptInvitationAction(invitationId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Você entrou na equipe!')
      }
    })
  }

  function handleDecline(invitationId: string) {
    startTransition(async () => {
      const result = await declineInvitationAction(invitationId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Convite recusado')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="bg-muted flex items-center justify-between rounded-lg px-4 py-3"
        >
          <p className="text-sm">
            Você foi convidado(a) para entrar em <strong>{invitation.teamName}</strong> como{' '}
            {invitation.role}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDecline(invitation.id)}
              disabled={isPending}
            >
              Recusar
            </Button>
            <Button size="sm" onClick={() => handleAccept(invitation.id)} disabled={isPending}>
              Aceitar
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
