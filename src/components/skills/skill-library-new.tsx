'use client'

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { fetchTeamSkills, type SkillRow } from '@/lib/queries/skills'
import { SKILL_CATEGORIES, LEGACY_CATEGORY_MAP, skillCategoryLabels } from '@/data/skills'
import SkillCardNew from './skill-card-new'
import SkillFilterSidebar from './skill-filter-sidebar'

// Derive colorBg from skill data — exact HSL values from prototype
function getColorBg(skill: SkillRow): string {
  // The static registry now stores colorBg per skill; fall back to category-based palette
  const categoryMap: Record<string, string> = {
    'carrinho-conversao': 'hsl(217 91% 95%)',
    'retencao-churn': 'hsl(270 70% 96%)',
    'marketing-campanhas': 'hsl(217 91% 95%)',
    'ads-performance': 'hsl(38 100% 95%)',
    'analytics-inteligencia': 'hsl(142 76% 96%)',
    'atendimento-experiencia': 'hsl(142 76% 96%)',
    'produto-catalogo': 'hsl(142 76% 96%)',
    'redes-sociais': 'hsl(38 100% 95%)',
    'visibilidade-ia': 'hsl(270 70% 96%)',
    // Legacy keys
    campaign: 'hsl(217 91% 95%)',
    content: 'hsl(270 70% 96%)',
    retention: 'hsl(270 70% 96%)',
    analytics: 'hsl(142 76% 96%)',
    ads: 'hsl(38 100% 95%)',
    operations: 'hsl(270 70% 96%)',
    scale: 'hsl(142 76% 96%)',
    cart: 'hsl(217 91% 95%)',
    social: 'hsl(38 100% 95%)',
    foundation: 'hsl(270 70% 96%)',
  }
  return categoryMap[skill.category] ?? 'hsl(0 0% 94%)'
}

function getEmoji(skill: SkillRow): string {
  if (skill.emoji) return skill.emoji
  if (skill.icon && skill.icon.length <= 4 && /\p{Emoji}/u.test(skill.icon)) {
    return skill.icon
  }
  const defaultEmoji: Record<string, string> = {
    'carrinho-conversao': '🛒',
    'retencao-churn': '🛡️',
    'marketing-campanhas': '🎯',
    'ads-performance': '⚡',
    'analytics-inteligencia': '📈',
    'atendimento-experiencia': '💬',
    'produto-catalogo': '📦',
    'redes-sociais': '📲',
    'visibilidade-ia': '✨',
    campaign: '🎯',
    content: '📦',
    retention: '🛡️',
    analytics: '📈',
    ads: '⚡',
    operations: '✨',
    scale: '💬',
    cart: '🛒',
    social: '📲',
    foundation: '✨',
  }
  return defaultEmoji[skill.category] ?? '⚙️'
}

// Resolve a DB category (could be legacy or new) to the display category key
function resolveCategory(category: string): string {
  return LEGACY_CATEGORY_MAP[category] ?? category
}

interface SkillLibraryNewProps {
  teamId: string
  initialSkills: SkillRow[]
}

export default function SkillLibraryNew({ teamId, initialSkills }: SkillLibraryNewProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'recommended'>('all')
  const [categoryFilter, setCategoryFilter] = useState('')

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
      if (categoryFilter) {
        const resolved = resolveCategory(skill.category)
        if (resolved !== categoryFilter) return false
      }
      if (!q) return true
      return (
        skill.name.toLowerCase().includes(q) || (skill.description ?? '').toLowerCase().includes(q)
      )
    })
  }, [skills, statusFilter, categoryFilter, search])

  const statusItems = [
    { key: 'all' as const, label: 'All', count: 38 },
    { key: 'active' as const, label: 'Active', count: activeCount },
    { key: 'recommended' as const, label: 'Recommended', count: 6 },
  ]

  const activeCategoryLabel = categoryFilter
    ? (skillCategoryLabels[categoryFilter] ?? categoryFilter)
    : null

  return (
    <div className="bg-background flex min-h-full">
      {/* ── Filter sidebar ─────────────────────────────────────────── */}
      <SkillFilterSidebar
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        activeCount={activeCount}
        onStatusChange={(s) => {
          setStatusFilter(s)
          setCategoryFilter('')
        }}
        onCategoryChange={(c) => {
          setCategoryFilter(c)
          setStatusFilter('all')
        }}
      />

      {/* ── Main content ───────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-7 flex items-center justify-between gap-6">
            <div>
              <h1 className="text-foreground text-2xl font-medium">Skills</h1>
              <p className="mt-1 text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
                38 capabilities you can connect to your orchestrator.{' '}
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
                className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
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

          {/* Mobile status chips */}
          <div className="mb-5 flex items-center gap-1.5 overflow-x-auto pb-1 md:hidden">
            {statusItems.map((item) => {
              const isActive = statusFilter === item.key && !categoryFilter
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setStatusFilter(item.key)
                    setCategoryFilter('')
                  }}
                  className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor: isActive ? 'var(--foreground)' : 'var(--border)',
                    background: isActive ? 'var(--muted)' : 'transparent',
                    color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Active category label */}
          {activeCategoryLabel && (
            <p className="text-muted-foreground mb-5 text-[13px]">{activeCategoryLabel}</p>
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
    </div>
  )
}
