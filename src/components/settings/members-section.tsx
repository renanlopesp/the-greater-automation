'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Member {
  id: string
  fullName: string
  email: string
  role: 'owner' | 'admin' | 'member'
}

interface MembersSectionProps {
  members: Member[]
}

const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
}

export default function MembersSection({ members }: MembersSectionProps) {
  function handleInvite() {
    toast('Invite flow coming soon')
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Members</h2>
        <Button variant="outline" size="sm" onClick={handleInvite}>
          Invite member
        </Button>
      </div>

      <div className="flex flex-col">
        {members.map((member) => {
          const initials = member.fullName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)

          return (
            <div key={member.id} className="border-border flex items-center gap-3 border-b py-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{member.fullName}</span>
                <span className="text-muted-foreground text-xs">{member.email}</span>
              </div>
              <Badge variant={ROLE_VARIANT[member.role]}>
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </Badge>
            </div>
          )
        })}
      </div>
    </div>
  )
}
