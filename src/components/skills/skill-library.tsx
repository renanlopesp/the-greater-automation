'use client'

import { useState, useMemo, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchTeamSkills, type SkillRow } from '@/lib/queries/skills'
import { activateSkill, deactivateSkill } from '@/lib/actions/skills'
import { skillCategories, skillCategoryLabels, type SkillCategory } from '@/data/skills'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import SkillCard from './skill-card'

interface SkillLibraryProps {
  teamId: string
  initialSkills: SkillRow[]
}

export default function SkillLibrary({ teamId, initialSkills }: SkillLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<SkillCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [pending, startTransition] = useTransition()

  const { data: skills = initialSkills, refetch } = useQuery({
    queryKey: ['skills', teamId],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchTeamSkills(supabase, teamId)
    },
    initialData: initialSkills,
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    let list = skills
    if (activeCategory !== 'all') {
      list = list.filter((s) => s.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q)
      )
    }
    // Active first
    return [...list].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1
      if (b.status === 'active' && a.status !== 'active') return 1
      return 0
    })
  }, [skills, activeCategory, search])

  // Categories that have skills
  const availableCategories = useMemo(
    () => skillCategories.filter((cat) => skills.some((s) => s.category === cat)),
    [skills]
  )

  function handleToggle(skill: SkillRow) {
    startTransition(async () => {
      if (skill.status === 'active') {
        await deactivateSkill(teamId, skill.slug)
      } else {
        await activateSkill(teamId, skill.slug)
      }
      await refetch()
    })
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Skills</h1>
        <p className="text-muted-foreground text-sm">
          Ative as capacidades que o Snew vai usar para ajudar seu negócio.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
            activeCategory === 'all'
              ? 'border-foreground/20 bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          )}
        >
          Todos
          <span className="text-muted-foreground ml-1.5">{skills.length}</span>
        </button>
        {availableCategories.map((cat) => {
          const count = skills.filter((s) => s.category === cat).length
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                activeCategory === cat
                  ? 'border-foreground/20 bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              )}
            >
              {skillCategoryLabels[cat]}
              <span className="text-muted-foreground ml-1.5">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma skill encontrada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((skill) => (
            <div key={skill.slug} className="group relative">
              <SkillCard
                slug={skill.slug}
                name={skill.name}
                description={skill.description ?? ''}
                category={skill.category as SkillCategory}
                icon={skill.icon ?? 'zap'}
                color={skill.color ?? '#648EE9'}
                isActive={skill.status === 'active'}
              />
              <div className="absolute inset-x-0 bottom-3 flex justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  size="sm"
                  variant={skill.status === 'active' ? 'outline' : 'default'}
                  className="h-7 rounded-full px-3 text-xs shadow-md"
                  disabled={pending}
                  onClick={(e) => {
                    e.preventDefault()
                    handleToggle(skill)
                  }}
                >
                  {skill.status === 'active' ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
