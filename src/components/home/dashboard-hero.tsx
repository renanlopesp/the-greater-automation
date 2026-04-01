'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import HeroRotatingTitle from '@/components/home/hero-rotating-title'
import AskBarNew from '@/components/home/ask-bar-new'
import SkillSelector from '@/components/home/skill-selector'
import { getActiveSkillConfigs } from '@/lib/skills/skill-registry'

async function fetchActiveSkillSlugs(): Promise<string[]> {
  const res = await fetch('/api/skills')
  if (!res.ok) return []
  const data = await res.json()
  return (data.skills ?? [])
    .filter((s: { status: string }) => s.status === 'active')
    .map((s: { slug: string }) => s.slug)
}

export default function DashboardHero() {
  const [selectedSkill, setSelectedSkill] = useState('general')

  const { data: activeSlugs = [] } = useQuery({
    queryKey: ['active-skill-slugs'],
    queryFn: fetchActiveSkillSlugs,
    staleTime: 60_000,
  })

  const skillConfigs = getActiveSkillConfigs(activeSlugs)
  const currentConfig = skillConfigs.find((s) => s.slug === selectedSkill) ?? skillConfigs[0]

  return (
    <div className="flex w-full flex-col items-center" style={{ maxWidth: 680, gap: 20 }}>
      <HeroRotatingTitle />
      <AskBarNew selectedSkill={selectedSkill === 'general' ? undefined : selectedSkill} />
      <SkillSelector skills={skillConfigs} selected={selectedSkill} onSelect={setSelectedSkill} />
      {/* Suggestion chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {currentConfig.suggestions.slice(0, 3).map((text) => (
          <button
            key={text}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-full border px-4 py-2 text-[13px] transition-colors"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
