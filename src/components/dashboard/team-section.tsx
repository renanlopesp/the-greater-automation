import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface TeamSectionProps {
  team: { name: string; avatar_url: string | null }
}

function getInitials(name: string): string {
  return name
    .split(/[\s']+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

export default function TeamSection({ team }: TeamSectionProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Avatar>
        {team.avatar_url && <AvatarImage src={team.avatar_url} alt={team.name} />}
        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
          {getInitials(team.name)}
        </AvatarFallback>
      </Avatar>
      <h2 className="text-lg font-semibold">{team.name}</h2>
    </div>
  )
}
