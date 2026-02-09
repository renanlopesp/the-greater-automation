'use client'

import { formatDistanceToNow } from 'date-fns'
import { Plus } from 'lucide-react'

interface Skill {
  id: string
  name: string
  last_run_at: string | null
  workflow: { name: string; emoji: string } | null
}

interface SkillsListProps {
  skills: Skill[]
  agentId: string
}

export default function SkillsList({ skills }: SkillsListProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-foreground text-[15px] font-semibold">Skills</h2>

      <div className="bg-background overflow-hidden rounded-2xl border shadow-sm">
        <div className="divide-y">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="hover:bg-muted/40 flex items-center gap-3 px-4 py-3 transition-colors"
            >
              <div className="bg-background relative flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm">
                <span className="text-xl">{skill.workflow?.emoji ?? '⚡'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{skill.name}</p>
                <p className="text-muted-foreground text-xs">
                  {skill.last_run_at
                    ? formatDistanceToNow(new Date(skill.last_run_at), { addSuffix: true })
                    : 'Never ran'}
                </p>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
          >
            <div className="bg-background flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm">
              <Plus className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold">New skill</span>
          </button>
        </div>
      </div>
    </div>
  )
}
