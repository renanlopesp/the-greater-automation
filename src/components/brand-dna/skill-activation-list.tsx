'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

interface Skill {
  slug: string
  name: string
  description: string
  color: string
}

interface SkillActivationListProps {
  skills: Skill[]
  onComplete: (selectedSlugs: string[]) => void
}

export function SkillActivationList({ skills, onComplete }: SkillActivationListProps) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(skills.map((s) => [s.slug, true]))
  )

  const toggle = (slug: string) => setEnabled((prev) => ({ ...prev, [slug]: !prev[slug] }))

  const handleComplete = () => {
    const selected = skills.filter((s) => enabled[s.slug]).map((s) => s.slug)
    onComplete(selected)
  }

  return (
    <div className="mb-8">
      <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
        O que eu recomendo
      </span>
      <p
        className="text-muted-foreground mb-4 text-[14px] leading-relaxed"
        style={{ lineHeight: 1.6 }}
      >
        Três habilidades pra começar. Com elas, gero sua primeira campanha de Dia das Mães nos
        próximos minutos:
      </p>
      <div className="mb-8 flex flex-col gap-3.5">
        {skills.map((skill) => (
          <div key={skill.slug} className="flex items-start gap-3">
            <div
              className="mt-[6px] h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: skill.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-[14px] leading-snug font-semibold">{skill.name}</p>
              <p className="text-muted-foreground mt-0.5 text-[13px]">{skill.description}</p>
            </div>
            <Switch
              checked={enabled[skill.slug] ?? true}
              onCheckedChange={() => toggle(skill.slug)}
              className="mt-0.5 flex-shrink-0"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Button className="h-11 w-full text-[14px] font-medium" onClick={handleComplete}>
          Começar com essas habilidades
        </Button>
        <p className="text-muted-foreground text-center text-[12px]">
          Você pode ativar mais habilidades e editar o Brand DNA quando quiser.
        </p>
      </div>
    </div>
  )
}
