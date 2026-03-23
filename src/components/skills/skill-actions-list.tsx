interface ActionItem {
  action: string
  frequency: string
}

interface SkillActionsListProps {
  actions: ActionItem[]
}

export default function SkillActionsList({ actions }: SkillActionsListProps) {
  return (
    <section>
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
        What it does
      </p>
      <div className="divide-border border-border divide-y overflow-hidden rounded-xl border">
        {actions.map((item, i) => (
          <div key={i} className="bg-background flex items-center justify-between px-5 py-3.5">
            <span className="text-muted-foreground flex-1 pr-4 text-[13px] leading-snug">
              {item.action}
            </span>
            <span className="bg-muted text-muted-foreground shrink-0 rounded-md px-2 py-1 text-[11px] font-medium">
              {item.frequency}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
