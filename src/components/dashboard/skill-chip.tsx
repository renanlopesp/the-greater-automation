interface SkillChipProps {
  emoji: string
  name: string
}

export default function SkillChip({ emoji, name }: SkillChipProps) {
  return (
    <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
      {emoji} {name}
    </span>
  )
}
