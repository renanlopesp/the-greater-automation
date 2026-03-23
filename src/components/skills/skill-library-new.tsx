'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchTeamSkills, type SkillRow } from '@/lib/queries/skills'
import { skillCategoryLabels, type SkillCategory } from '@/data/skills'
import SkillCardNew from './skill-card-new'

// Color map: category key → colorBg for emoji icon background
const CATEGORY_COLOR_BG: Record<string, string> = {
  campaign: 'hsl(217 91% 95%)',
  content: 'hsl(270 70% 96%)',
  retention: 'hsl(270 70% 96%)',
  analytics: 'hsl(142 76% 96%)',
  ads: 'hsl(38 100% 95%)',
  operations: 'hsl(270 70% 96%)',
  scale: 'hsl(142 76% 96%)',
  cart: 'hsl(217 91% 95%)',
  social: 'hsl(38 100% 95%)',
  foundation: 'hsl(0 84% 96%)',
}

function getColorBg(skill: SkillRow): string {
  if (skill.color) return `${skill.color}20`
  return CATEGORY_COLOR_BG[skill.category] ?? 'hsl(0 0% 94%)'
}

// Map icon string → emoji fallback for skills that have no emoji
const DEFAULT_EMOJI: Record<string, string> = {
  campaign: '🎯',
  content: '📦',
  retention: '🛡️',
  analytics: '📈',
  ads: '⚡',
  operations: '✨',
  scale: '💬',
  cart: '🛒',
  social: '📲',
  foundation: '⚙️',
}

function getEmoji(skill: SkillRow): string {
  // The skill registry stores emoji in the icon field for new-architecture skills
  // If icon is a single emoji char (or multi-char emoji), use it directly
  if (skill.icon && skill.icon.length <= 4 && /\p{Emoji}/u.test(skill.icon)) {
    return skill.icon
  }
  return DEFAULT_EMOJI[skill.category] ?? '⚙️'
}

interface SkillLibraryNewProps {
  teamId: string
  initialSkills: SkillRow[]
}

export default function SkillLibraryNew({ teamId, initialSkills }: SkillLibraryNewProps) {
  const [search, setSearch] = useState('')
  const params = useSearchParams()
  const statusFilter = params.get('status') ?? 'all'
  const categoryFilter = params.get('category') ?? ''

  const { data: skills = initialSkills } = useQuery({
    queryKey: ['skills', teamId],
    queryFn: async () => {
      const supabase = createBrowserClient()
      return fetchTeamSkills(supabase, teamId)
    },
    initialData: initialSkills,
    staleTime: 30_000,
  })

  const activeCount = useMemo(() => skills.filter((s) => s.status === 'active').length, [skills])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return skills.filter((skill) => {
      if (statusFilter === 'active' && skill.status !== 'active') return false
      if (categoryFilter && skill.category !== categoryFilter) return false
      if (!q) return true
      return (
        skill.name.toLowerCase().includes(q) || (skill.description ?? '').toLowerCase().includes(q)
      )
    })
  }, [skills, statusFilter, categoryFilter, search])

  return (
    <div className="min-w-0 flex-1 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-7 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-foreground text-2xl font-medium">Skills</h1>
            <p className="text-muted-foreground mt-1 text-[14px]">
              {skills.length} capabilities you can connect to your orchestrator.{' '}
              <span className="text-foreground font-medium">{activeCount} active</span>.
            </p>
          </div>
          {/* Search */}
          <div className="bg-muted flex w-56 shrink-0 items-center gap-2 rounded-full px-4 py-2.5">
            <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <input
              type="text"
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-muted-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active category label */}
        {categoryFilter && (
          <p className="text-muted-foreground mb-5 text-[13px]">
            {skillCategoryLabels[categoryFilter as SkillCategory] ?? categoryFilter}
          </p>
        )}

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((skill) => (
              <SkillCardNew
                key={skill.slug}
                slug={skill.slug}
                name={skill.name}
                description={skill.description ?? ''}
                emoji={getEmoji(skill)}
                status={skill.status}
                colorBg={getColorBg(skill)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground text-sm">
              {search ? `No skills found for "${search}"` : 'No skills found.'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-sm font-medium"
                style={{ color: 'var(--green)' }}
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
