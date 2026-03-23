'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchTeamSkills, type SkillRow } from '@/lib/queries/skills'

export function useSkills(teamId: string | undefined) {
  const query = useQuery({
    queryKey: ['skills', teamId],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchTeamSkills(supabase, teamId!)
    },
    enabled: !!teamId,
  })

  const skills = query.data ?? []
  const activeSkills = skills.filter((s) => s.status === 'active')
  const skillsByCategory = skills.reduce<Record<string, SkillRow[]>>((acc, skill) => {
    const cat = skill.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill)
    return acc
  }, {})

  return {
    skills,
    activeSkills,
    skillsByCategory,
    isLoading: query.isLoading,
    error: query.error,
  }
}
