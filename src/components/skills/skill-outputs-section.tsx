import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface OutputItem {
  title: string
  description: string
  href?: string
}

interface SkillOutputsSectionProps {
  outputs: OutputItem[]
}

export default function SkillOutputsSection({ outputs }: SkillOutputsSectionProps) {
  return (
    <section>
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
        Outputs
      </p>
      <div className="divide-border border-border divide-y overflow-hidden rounded-xl border">
        {outputs.map((output) =>
          output.href ? (
            <Link
              key={output.title}
              href={output.href}
              className="bg-background hover:bg-muted/50 flex w-full items-center justify-between p-4 text-left transition-colors"
            >
              <div>
                <p className="text-foreground text-sm font-medium">{output.title}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{output.description}</p>
              </div>
              <ChevronRight className="text-muted-foreground ml-3 h-4 w-4 shrink-0" />
            </Link>
          ) : (
            <div
              key={output.title}
              className="bg-background flex w-full items-center justify-between p-4 text-left"
            >
              <div>
                <p className="text-foreground text-sm font-medium">{output.title}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{output.description}</p>
              </div>
              <ChevronRight className="text-muted-foreground ml-3 h-4 w-4 shrink-0" />
            </div>
          )
        )}
      </div>
    </section>
  )
}
