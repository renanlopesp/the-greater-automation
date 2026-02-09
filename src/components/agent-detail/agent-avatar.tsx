import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface AgentAvatarProps {
  name?: string
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function AgentAvatar({ name = 'Agent' }: AgentAvatarProps) {
  return (
    <Avatar className="h-20 w-20">
      <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
