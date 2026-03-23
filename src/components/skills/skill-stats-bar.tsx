interface StatItem {
  value: string
  label: string
}

interface SkillStatsBarProps {
  stats: StatItem[]
}

export default function SkillStatsBar({ stats }: SkillStatsBarProps) {
  return (
    <div className="flex items-start gap-12">
      {stats.map((stat) => (
        <div key={stat.label}>
          <p className="text-foreground text-2xl font-semibold">{stat.value}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}
