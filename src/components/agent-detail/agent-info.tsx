interface AgentInfoProps {
  name: string
  description: string | null
}

export default function AgentInfo({ name, description }: AgentInfoProps) {
  return (
    <div className="space-y-1">
      <h1 className="truncate text-2xl font-bold">{name}</h1>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
    </div>
  )
}
