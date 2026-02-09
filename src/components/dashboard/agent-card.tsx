'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LetterGlitch } from '@/components/ui/letter-glitch'

export interface AgentCardProps {
  agent: {
    id: string
    name: string
    description: string | null
    avatar_url: string | null
  }
  skills: { id: string; name: string }[]
  index?: number
}

const GLITCH_PALETTES = [
  ['#1a3a5c', '#648EE9', '#a3c4f3'], // blue
  ['#4e1a05', '#D7733E', '#f0a875'], // orange
  ['#0a3d1f', '#5BA87B', '#8fd4a8'], // green
  ['#2d1150', '#9B6BC4', '#c9a7e4'], // purple
]

function getInitials(name: string): string {
  return name
    .split(/[\s]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function AgentCard({ agent, skills, index = 0 }: AgentCardProps) {
  const [hovered, setHovered] = useState(false)
  const palette = GLITCH_PALETTES[index % GLITCH_PALETTES.length]

  return (
    <Link href={`/agents/${agent.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Card className="relative flex h-[220px] flex-col overflow-hidden transition-shadow hover:shadow-md">
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{ opacity: hovered ? 0.2 : 0 }}
          >
            <LetterGlitch
              glitchColors={palette}
              glitchSpeed={70}
              outerVignette={true}
              smooth={true}
              active={hovered}
            />
          </div>
          <CardHeader className="relative flex flex-1 flex-col items-center gap-3 pb-0">
            <Avatar size="lg" className="h-14 w-14">
              {agent.avatar_url && <AvatarImage src={agent.avatar_url} alt={agent.name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(agent.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="truncate text-sm font-medium">{agent.name}</span>
              {agent.description && (
                <span className="text-muted-foreground line-clamp-2 text-xs">
                  {agent.description}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="relative flex flex-wrap items-center justify-center gap-1 pt-0">
            {skills.length === 0 ? (
              <span className="text-muted-foreground text-xs">0 skills</span>
            ) : skills.length <= 3 ? (
              skills.map((skill) => (
                <Badge key={skill.id} variant="secondary" className="text-[10px]">
                  {skill.name}
                </Badge>
              ))
            ) : (
              <>
                {skills.slice(0, 2).map((skill) => (
                  <Badge key={skill.id} variant="secondary" className="text-[10px]">
                    {skill.name}
                  </Badge>
                ))}
                <Badge variant="secondary" className="text-[10px]">
                  +{skills.length - 2}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}
