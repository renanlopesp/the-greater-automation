interface UseCaseCardProps {
  emoji: string
  title: string
  description: string
  onClick?: () => void
}

export default function UseCaseCard({ emoji, title, description, onClick }: UseCaseCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-muted/50 flex flex-col gap-1.5 rounded-lg border p-4 text-left transition-colors"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-medium">{title}</span>
      <span className="text-muted-foreground text-xs">{description}</span>
    </button>
  )
}
