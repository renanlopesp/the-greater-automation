import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface TeamSectionProps {
  team: { name: string; avatar_url: string | null }
}

export default function TeamSection({ team }: TeamSectionProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={team.avatar_url ?? undefined} />
        <AvatarFallback>{team.name[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <h2 className="text-xl font-semibold">{team.name}</h2>
    </div>
  )
}
