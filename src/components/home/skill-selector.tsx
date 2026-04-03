'use client'

import { Calendar, MessageSquare, PenTool } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SkillConfig } from '@/lib/skills/skill-registry'

const ICON_MAP: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare size={14} />,
  Calendar: <Calendar size={14} />,
  PenTool: <PenTool size={14} />,
}

interface SkillSelectorProps {
  skills: SkillConfig[]
  selected: string
  onSelect: (slug: string) => void
}

export default function SkillSelector({ skills, selected, onSelect }: SkillSelectorProps) {
  if (skills.length <= 1) return null

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {skills.map((skill) => {
        const isActive = skill.slug === selected
        return (
          <button
            key={skill.slug}
            onClick={() => onSelect(skill.slug)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all',
              isActive
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground border-border hover:bg-accent/60 border'
            )}
          >
            {ICON_MAP[skill.icon] ?? <MessageSquare size={14} />}
            {skill.name}
          </button>
        )
      })}
    </div>
  )
}
