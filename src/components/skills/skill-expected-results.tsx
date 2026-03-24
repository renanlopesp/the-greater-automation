interface SkillExpectedResultsProps {
  results: string[]
}

export default function SkillExpectedResults({ results }: SkillExpectedResultsProps) {
  return (
    <section>
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
        Expected result
      </p>
      <ul className="space-y-2">
        {results.map((result, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--green)' }}
            />
            <span className="text-muted-foreground text-sm leading-relaxed">{result}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
