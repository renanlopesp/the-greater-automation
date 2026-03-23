interface SkillAboutSectionProps {
  description: string
}

export default function SkillAboutSection({ description }: SkillAboutSectionProps) {
  return (
    <section>
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
        About
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </section>
  )
}
