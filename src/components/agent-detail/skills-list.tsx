'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Webhook, Clock, MessageSquare, Play, Zap, X } from 'lucide-react'
import { removeSkill } from '@/lib/actions/agent-skills'
import { useInvalidateAgentSkills } from '@/hooks/use-agent-skills'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
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
  trigger_config?: Record<string, unknown> | null
  conditions?: unknown[]
  actions?: unknown[]
  is_enabled?: boolean
  execution_mode?: string
  run_count?: number
}

interface SkillsListProps {
  skills: Skill[]
  agentId: string
  teamId: string
}

export default function SkillsList({ skills, agentId, teamId }: SkillsListProps) {
  const invalidateSkills = useInvalidateAgentSkills(agentId)
  const [isPending, startTransition] = useTransition()
  const [executingSkills, setExecutingSkills] = useState<Set<string>>(new Set())

  function handleRemove(skillId: string) {
    startTransition(async () => {
      const result = await removeSkill(skillId, agentId)
      if (!result.error) {
        invalidateSkills()
      }
    })
  }

  async function handleToggleEnabled(skillId: string, currentEnabled: boolean) {
    // TODO: Implement toggle enabled action
    console.log('Toggle skill', skillId, !currentEnabled)
  }

  async function handleExecute(skillId: string) {
    setExecutingSkills((prev) => new Set(prev).add(skillId))
    try {
      const response = await fetch(`/api/skills/${skillId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_data: {} }),
      })
      const result = await response.json()
      if (result.success) {
        invalidateSkills()
      }
    } catch (error) {
      console.error('Failed to execute skill:', error)
    } finally {
      setExecutingSkills((prev) => {
        const next = new Set(prev)
        next.delete(skillId)
        return next
      })
    }
  }

  function getTriggerIcon(triggerConfig: Record<string, unknown> | null | undefined) {
    const type = triggerConfig?.type as string | undefined
    switch (type) {
      case 'webhook':
        return <Webhook className="h-4 w-4" />
      case 'scheduled':
        return <Clock className="h-4 w-4" />
      case 'chat_command':
        return <MessageSquare className="h-4 w-4" />
      case 'manual':
        return <Play className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  // Separate legacy and rule skills
  const legacySkills = skills.filter((s) => s.source === 'manual' || s.source === 'dynamic')
  const ruleSkills = skills.filter((s) => s.source === 'rule')

  return (
    <div className="space-y-3">
      <h2 className="text-foreground text-[15px] font-semibold">Skills</h2>

      <div className="bg-background overflow-hidden rounded-2xl border shadow-sm">
        <div className="divide-y">
          {/* Rule-based skills */}
          {ruleSkills.map((skill) => {
            const conditionCount = Array.isArray(skill.conditions) ? skill.conditions.length : 0
            const isManualTrigger =
              (skill.trigger_config as Record<string, unknown> | null)?.type === 'manual'

            return (
              <div
                key={skill.id}
                className="hover:bg-muted/40 group flex items-center gap-3 px-4 py-3 transition-colors"
              >
                <div className="bg-background text-muted-foreground relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border shadow-sm">
                  {getTriggerIcon(skill.trigger_config)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{skill.name}</p>
                    {conditionCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {conditionCount} {conditionCount === 1 ? 'condition' : 'conditions'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {skill.last_run_at
                      ? `Last ran ${formatDistanceToNow(new Date(skill.last_run_at), { addSuffix: true })}`
                      : 'Never ran'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isManualTrigger && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExecute(skill.id)}
                      disabled={executingSkills.has(skill.id)}
                      className="h-8 px-2"
                    >
                      {executingSkills.has(skill.id) ? 'Running...' : 'Run'}
                    </Button>
                  )}
                  <Switch
                    checked={skill.is_enabled ?? false}
                    onCheckedChange={() => handleToggleEnabled(skill.id, skill.is_enabled ?? false)}
                    aria-label="Toggle skill"
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemove(skill.id)}
                    className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Legacy skills (manual/dynamic) */}
          {legacySkills.map((skill) => {
            const isDynamic = skill.source === 'dynamic'
            const emoji = isDynamic ? '⚡' : (skill.workflow?.emoji ?? '🔧')

            return (
              <div
                key={skill.id}
                className="hover:bg-muted/40 group flex items-center gap-3 px-4 py-3 transition-colors"
              >
                <div className="bg-background relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border shadow-sm">
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

          {/* Help text for creating new skills */}
          {skills.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-muted-foreground text-sm">No skills yet</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Chat with your agent to create new skills
              </p>
            </div>
          ) : (
            <div className="bg-muted/20 px-4 py-3">
              <p className="text-muted-foreground text-center text-xs">
                Chat with your agent to create new skills
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
