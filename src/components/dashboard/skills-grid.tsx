'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchTeamSkills } from '@/lib/queries/skills'
import { skillCategories, skillCategoryLabels, type SkillCategory } from '@/data/skills'
import SkillCard from '@/components/skills/skill-card'

interface SkillsGridProps {
  teamId: string
  initialSkills?: Awaited<ReturnType<typeof fetchTeamSkills>>
}

export default function SkillsGrid({ teamId, initialSkills = [] }: SkillsGridProps) {
  const { data: skills = initialSkills } = useQuery({
    queryKey: ['skills', teamId],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchTeamSkills(supabase, teamId)
    },
    initialData: initialSkills,
    staleTime: 30_000,
  })

  // Sort: active first, then available
  const sorted = [...skills].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1
    if (b.status === 'active' && a.status !== 'active') return 1
    return 0
  })

  // Group by category, preserving category order
  const grouped = skillCategories
    .map((cat) => ({
      category: cat,
      label: skillCategoryLabels[cat],
      items: sorted.filter((s) => s.category === cat),
    }))
    .filter((g) => g.items.length > 0)

  if (grouped.length === 0) return null

  return (
    <section className="flex flex-col gap-10">
      <h3 className="text-lg font-semibold">Skills</h3>
      {grouped.map(({ category, label, items }) => (
        <div key={category} className="flex flex-col gap-4">
          <h4 className="text-muted-foreground text-sm font-medium">{label}</h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((skill) => (
              <SkillCard
                key={skill.slug}
                slug={skill.slug}
                name={skill.name}
                description={skill.description ?? ''}
                category={skill.category as SkillCategory}
                icon={skill.icon ?? 'zap'}
                color={skill.color ?? '#648EE9'}
                isActive={skill.status === 'active'}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
