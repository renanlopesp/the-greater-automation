'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDown, X } from 'lucide-react'
import InviteMemberDialog from '@/components/settings/invite-member-dialog'
import type { TeamMember, TeamInvitation, PlanData } from '@/types/navigation'
import {
  updateMemberRoleAction,
  removeMemberAction,
  cancelInvitationAction,
} from '@/lib/actions/members'

interface MembersSectionProps {
  members: TeamMember[]
  invitations: TeamInvitation[]
  currentUserRole: 'owner' | 'admin' | 'member'
  currentUserId: string
  planData: PlanData | null
}

const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
}

const ROLE_ORDER: Record<string, number> = { owner: 0, admin: 1, member: 2 }

const ROLE_DESCRIPTION: Record<string, { title: string; permissions: string[] }> = {
  owner: {
    title: 'Proprietário',
    permissions: [
      'Acesso total a todos os recursos',
      'Criar, editar e excluir automações e agentes',
      'Gerenciar membros e funções da equipe',
      'Alterar configurações do workspace',
      'Transferir propriedade',
    ],
  },
  admin: {
    title: 'Administrador',
    permissions: [
      'Criar, editar e excluir automações e agentes',
      'Convidar e remover membros',
      'Alterar configurações do workspace',
      'Não pode alterar a função de proprietário',
    ],
  },
  member: {
    title: 'Membro',
    permissions: [
      'Visualizar automações, agentes e execuções',
      'Executar automações publicadas',
      'Não pode criar, editar ou excluir recursos',
      'Não pode convidar membros ou alterar configurações',
    ],
  },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function MembersSection({
  members,
  invitations,
  currentUserRole,
  currentUserId,
  planData,
}: MembersSectionProps) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'
  const isOwner = currentUserRole === 'owner'

  function handleRoleChange(userId: string, newRole: string) {
    const formData = new FormData()
    formData.append('userId', userId)
    formData.append('role', newRole)

    startTransition(async () => {
      const result = await updateMemberRoleAction(formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Função atualizada')
      }
    })
  }

  function handleRemoveMember(userId: string) {
    startTransition(async () => {
      const result = await removeMemberAction(userId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Membro removido')
      }
    })
  }

  function handleCancelInvitation(invitationId: string) {
    startTransition(async () => {
      const result = await cancelInvitationAction(invitationId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Convite cancelado')
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Membros</h2>
          <p className="text-muted-foreground text-sm">Gerencie quem tem acesso a este workspace</p>
        </div>
        {canManage &&
          (planData?.planId === 'free' ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                Faça upgrade para convidar membros
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  toast('Faça upgrade para Pro para convidar membros da equipe', {
                    action: {
                      label: 'Ver planos',
                      onClick: () => {
                        window.dispatchEvent(
                          new CustomEvent('switch-settings-tab', { detail: 'billing' })
                        )
                      },
                    },
                  })
                }}
              >
                Fazer upgrade
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              Convidar membro
            </Button>
          ))}
      </div>

      {planData && members.length >= planData.maxTeamMembers && planData.planId !== 'free' && (
        <div className="rounded-lg bg-yellow-50 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-200">
          Você atingiu o limite do seu plano de {planData.maxTeamMembers} membros. Faça upgrade para
          mais vagas.
        </div>
      )}

      {/* Members list */}
      <div className="flex flex-col">
        {members.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Nenhum membro ainda. Convide alguém para começar.
          </p>
        ) : (
          members
            .toSorted((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))
            .map((member) => {
              const isSelf = member.id === currentUserId
              const canChangeRole = isOwner && !isSelf && member.role !== 'owner'
              const canRemove =
                !isSelf &&
                member.role !== 'owner' &&
                (isOwner || (currentUserRole === 'admin' && member.role === 'member'))

              return (
                <div
                  key={member.id}
                  className="border-border flex items-center gap-3 border-b py-3"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatarUrl ?? undefined} alt={member.fullName} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium">
                      {member.fullName}
                      {isSelf && <span className="text-muted-foreground ml-1 text-xs">(você)</span>}
                    </span>
                    <span className="text-muted-foreground text-xs">{member.email}</span>
                  </div>

                  {canChangeRole ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2">
                          <Badge variant={ROLE_VARIANT[member.role]}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, 'admin')}
                          disabled={member.role === 'admin'}
                        >
                          Administrador
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, 'member')}
                          disabled={member.role === 'member'}
                        >
                          Membro
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="cursor-pointer">
                          <Badge variant={ROLE_VARIANT[member.role]}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-64 p-3">
                        <p className="mb-2 text-sm font-semibold">
                          {ROLE_DESCRIPTION[member.role]?.title ?? member.role}
                        </p>
                        <ul className="text-muted-foreground space-y-1 text-xs">
                          {ROLE_DESCRIPTION[member.role]?.permissions.map((perm) => (
                            <li key={perm} className="flex items-start gap-1.5">
                              <span className="mt-0.5 shrink-0">
                                {perm.startsWith('Cannot') ? '✕' : '✓'}
                              </span>
                              <span>{perm}</span>
                            </li>
                          ))}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  )}

                  {canRemove && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground h-7 w-7"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover membro</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover {member.fullName} da equipe? Ele perderá
                            o acesso a todos os recursos da equipe.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveMember(member.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )
            })
        )}
      </div>

      {/* Pending invitations */}
      {canManage && invitations.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Convites pendentes</h3>
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="border-border flex items-center gap-3 border-b py-3"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {invitation.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{invitation.email}</span>
                <span className="text-muted-foreground text-xs">
                  Convidado como {invitation.role}
                </span>
              </div>
              <Badge variant="outline" className="text-yellow-600">
                Pendente
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-7 w-7"
                onClick={() => handleCancelInvitation(invitation.id)}
                disabled={isPending}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}
