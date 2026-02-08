'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import AnimatedAgentAvatar from '@/components/dashboard/animated-agent-avatar'
import SkillChip from '@/components/dashboard/skill-chip'

export interface AgentCardProps {
  agent: {
    id: string
    name: string
    description: string | null
    avatar_url: string | null
  }
  skills: { id: string; name: string }[]
}

export default function AgentCard({ agent, skills }: AgentCardProps) {
  const visibleSkills = skills.slice(0, 3)
  const remaining = skills.length - 3

  return (
    <Link href={`/agents/${agent.id}`}>
      <Card className="hover:border-primary/20 min-h-[180px] shadow-sm transition-all hover:shadow-md">
        <CardContent className="flex flex-col gap-3 p-4">
          <AnimatedAgentAvatar />
          <div className="flex flex-col gap-1">
            <span className="truncate text-sm font-medium">{agent.name}</span>
            {agent.description && (
              <p className="text-muted-foreground line-clamp-2 text-xs">{agent.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {visibleSkills.length === 0 ? (
              <span className="text-muted-foreground text-xs">No skills yet</span>
            ) : (
              <>
                {visibleSkills.map((s) => (
                  <SkillChip key={s.id} emoji="⚡" name={s.name} />
                ))}
                {remaining > 0 && <Badge variant="secondary">+{remaining}</Badge>}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
