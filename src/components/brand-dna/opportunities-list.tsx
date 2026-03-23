interface Opportunity {
  title: string
  description: string
  color: 'green' | 'amber'
}

interface OpportunitiesListProps {
  opportunities: Opportunity[]
}

const borderColors = {
  green: 'hsl(var(--green))',
  amber: 'hsl(var(--amber))',
}

const bgColors = {
  green: 'hsl(var(--green-bg))',
  amber: 'hsl(var(--amber-bg))',
}

export function OpportunitiesList({ opportunities }: OpportunitiesListProps) {
  return (
    <div className="mb-6">
      <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
        O que eu identifiquei
      </span>
      <div className="flex flex-col gap-2">
        {opportunities.map((opp, i) => (
          <div
            key={i}
            className="rounded-lg py-2.5 pr-4 pl-3"
            style={{
              borderLeft: `3px solid ${borderColors[opp.color]}`,
              background: bgColors[opp.color],
            }}
          >
            <p className="text-foreground mb-0.5 text-[13px] font-semibold">{opp.title}</p>
            <p className="text-muted-foreground text-[13px] leading-relaxed">{opp.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
