interface AgentInfoProps {
  name: string
  description: string | null
}

export default function AgentInfo({ name, description }: AgentInfoProps) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-foreground truncate text-[22px] font-bold tracking-tight">{name}</h1>
      {description && (
        <p className="text-muted-foreground mx-auto max-w-[34ch] text-sm leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
