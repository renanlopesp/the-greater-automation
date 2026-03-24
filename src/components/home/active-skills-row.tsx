import Link from 'next/link'

const ACTIVE_SKILLS = [
  { id: 'seasonal-calendar', name: 'Seasonal Calendar', time: '2h' },
  { id: 'campaign-engine', name: 'Campaign Engine', time: '45 min' },
  { id: 'revenue-intelligence', name: 'Revenue Intelligence', time: '6h' },
  { id: 'funnel-diagnostics', name: 'Funnel Diagnostics', time: '1d' },
] as const

export default function ActiveSkillsRow() {
  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-muted-foreground tracking-widest uppercase"
          style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em' }}
        >
          Active Skills
        </span>
        <Link
          href="/skills"
          className="text-muted-foreground hover:text-foreground text-[11px] transition-colors"
        >
          see all →
        </Link>
      </div>

      {/* Chips row */}
      <div className="flex flex-wrap gap-3">
        {ACTIVE_SKILLS.map((skill) => (
          <Link
            key={skill.id}
            href={`/skills/${skill.id}`}
            className="border-border hover:border-foreground/25 bg-background hover:bg-muted/40 flex items-center gap-2 rounded-full border px-3.5 py-2 transition-all"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--green)' }}
            />
            <span className="text-foreground text-[12px] font-medium">{skill.name}</span>
            <span className="text-muted-foreground text-[11px]">· {skill.time}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
