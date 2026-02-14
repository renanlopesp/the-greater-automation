'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Plus, X } from 'lucide-react'
import { removeSkill } from '@/lib/actions/agent-skills'
import AddSkillDialog from '@/components/agent-detail/add-skill-dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Skill {
  id: string
  name: string
  description: string | null
  source: string | null
  last_run_at: string | null
  workflow_id?: string | null
  workflow: { name: string; emoji: string } | null
  action_template?: Record<string, unknown> | null
}

interface SkillsListProps {
  skills: Skill[]
  agentId: string
  teamId: string
}

export default function SkillsList({ skills, agentId, teamId }: SkillsListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRemove(skillId: string) {
    startTransition(async () => {
      const result = await removeSkill(skillId, agentId)
      if (!result.error) {
        router.refresh()
      }
    })
  }

  const existingWorkflowIds = skills.map((s) => s.workflow_id).filter((id): id is string => !!id)

  return (
    <div className="space-y-3">
      <h2 className="text-foreground text-[15px] font-semibold">Skills</h2>

      <div className="bg-background overflow-hidden rounded-2xl border shadow-sm">
        <div className="divide-y">
          {skills.map((skill) => {
            const isDynamic = skill.source === 'dynamic'
            const emoji = isDynamic ? '⚡' : (skill.workflow?.emoji ?? '🔧')

            return (
              <div
                key={skill.id}
                className="hover:bg-muted/40 group flex items-center gap-3 px-4 py-3 transition-colors"
              >
                <div className="bg-background relative flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm">
                  <span className="text-xl">{emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{skill.name}</p>
                    {isDynamic && (
                      <Badge variant="secondary" className={cn('text-xs')}>
                        Dynamic
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {skill.description
                      ? skill.description
                      : skill.last_run_at
                        ? `Last ran ${formatDistanceToNow(new Date(skill.last_run_at), { addSuffix: true })}`
                        : 'Never ran'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRemove(skill.id)}
                  className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}

          <AddSkillDialog
            agentId={agentId}
            teamId={teamId}
            existingSkillWorkflowIds={existingWorkflowIds}
            trigger={
              <button
                type="button"
                className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
              >
                <div className="bg-background flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold">New skill</span>
              </button>
            }
          />
        </div>
      </div>
    </div>
  )
}
