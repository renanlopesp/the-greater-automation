'use client'

import { useState, lazy, Suspense } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import BoringAvatar from 'boring-avatars'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getAgentPalette, getGlitchPalette } from '@/lib/agent-palettes'

// Code-split heavy canvas animation — only loaded on first hover
const LetterGlitch = lazy(() =>
  import('@/components/ui/letter-glitch').then((m) => ({ default: m.LetterGlitch }))
)

export interface AgentCardProps {
  agent: {
    id: string
    name: string
    description: string | null
    avatar_url: string | null
    palette?: string | null
    is_active?: boolean | null
  }
  skills: { id: string; name: string }[]
}

export default function AgentCard({ agent, skills }: AgentCardProps) {
  const [hovered, setHovered] = useState(false)
  const palette = getGlitchPalette(agent.palette)

  return (
    <Link href={`/agents/${agent.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Card className="relative flex h-[280px] flex-col overflow-hidden transition-shadow hover:shadow-md">
          {/* Status dot */}
          <span
            className={cn(
              'absolute top-3 right-3 z-10 h-2.5 w-2.5 rounded-full',
              agent.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'
            )}
          />
          {hovered && (
            <div className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-300">
              <Suspense fallback={null}>
                <LetterGlitch
                  glitchColors={palette}
                  glitchSpeed={70}
                  outerVignette={true}
                  smooth={true}
                  active={true}
                />
              </Suspense>
            </div>
          )}
          <CardHeader className="relative flex flex-1 flex-col items-center gap-3 pb-0">
            <div className="rounded-full p-1 backdrop-blur-[5px]">
              <BoringAvatar
                name={agent.avatar_url ?? agent.name}
                variant="bauhaus"
                size={56}
                colors={getAgentPalette(agent.palette)}
              />
            </div>
            <div className="flex flex-col items-center gap-1 rounded-md px-3 pt-1 pb-2 text-center backdrop-blur-[5px]">
              <span className="truncate text-sm font-medium">{agent.name}</span>
              {agent.description && (
                <span className="text-muted-foreground line-clamp-2 text-xs">
                  {agent.description}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="relative flex flex-wrap items-center justify-center gap-1 pt-0">
            {!hovered || skills.length === 0 ? (
              <span className="text-muted-foreground text-xs">
                {skills.length} {skills.length === 1 ? 'skill' : 'skills'}
              </span>
            ) : (
              skills.map((skill) => (
                <Badge key={skill.id} variant="secondary" className="text-[10px]">
                  {skill.name}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}
