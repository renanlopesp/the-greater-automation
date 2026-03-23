// DEPRECATED: This component uses the old multi-agent catalog from @/data/agents.
// It will be replaced by a skill-based recommendation component.
// Do not extend — create a new component using @/data/skills instead.
'use client'

import { useCoworkerAvatars } from '@/hooks/use-coworker-avatars'
import CoworkerAvatar from '@/components/coworker-avatar'
import { agents as catalog } from '@/data/agents'

interface CoworkerRecommendationProps {
  /** IDs of agents already installed (from DB) */
  installedAgentTypes?: string[]
}

export default function CoworkerRecommendation({
  installedAgentTypes = [],
}: CoworkerRecommendationProps) {
  const { avatars } = useCoworkerAvatars()

  // Filter catalog to agents not yet installed (match by agentType or id)
  const recommendations = catalog
    .filter((a) => {
      if (installedAgentTypes.includes(a.id)) return false
      if (a.agentType && installedAgentTypes.includes(a.agentType)) return false
      return true
    })
    .slice(0, 3)

  if (recommendations.length === 0) return null

  return (
    <div>
      <h2 className="text-foreground mb-4 text-lg font-medium">Co-workers recomendados</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {recommendations.map((rec) => {
          const avatarUrl = avatars[rec.id]
          return (
            <div
              key={rec.id}
              className="border-border bg-background hover:border-foreground/20 group flex cursor-pointer flex-col rounded-2xl border p-5 transition-all"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <CoworkerAvatar src={avatarUrl} name={rec.name} size="xs" />
                  <p className="text-foreground text-sm font-medium">{rec.name}</p>
                </div>
                <p className="text-muted-foreground text-[13px] leading-relaxed">
                  {rec.description}
                </p>
              </div>
              <div className="border-border mt-auto border-t pt-3 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-muted-foreground/60 mb-1 text-[11px] font-medium">
                  Resultado esperado
                </p>
                <p className="text-muted-foreground text-[12px] leading-relaxed">
                  {rec.detailedDescription
                    ? rec.detailedDescription.split('\n')[0]
                    : rec.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
