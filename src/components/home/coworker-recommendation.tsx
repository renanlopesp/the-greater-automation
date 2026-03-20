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
      <div className="flex flex-col gap-3">
        {recommendations.map((rec) => {
          const avatarUrl = avatars[rec.id]
          return (
            <div
              key={rec.id}
              className="border-border bg-background flex flex-col gap-3 rounded-2xl border p-7"
            >
              <div className="flex items-center gap-2.5">
                <CoworkerAvatar src={avatarUrl} name={rec.name} size="xs" />
                <div className="flex items-center gap-1.5">
                  <p className="text-foreground text-sm font-medium">{rec.name}</p>
                  <span className="text-muted-foreground border-border rounded-full border px-2 py-0.5 text-[10px]">
                    Inativo
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground text-[13px] leading-relaxed">{rec.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
