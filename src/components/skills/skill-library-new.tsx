'use client'

import { useState, useMemo } from 'react'
import { Search, X, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { fetchSkillsAction } from '@/lib/actions/skills'
import type { SkillRow } from '@/lib/queries/skills'
import SkillCardNew from './skill-card-new'

// Derive colorBg from skill data — exact HSL values from prototype
function getColorBg(skill: SkillRow): string {
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-3"
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </p>
  )
}

export default function SkillLibraryNew() {
  const [search, setSearch] = useState('')

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => fetchSkillsAction(),
    staleTime: 30_000,
  })

  const totalActive = useMemo(() => skills.filter((s) => s.status === 'active').length, [skills])

  const activeSkills = useMemo(() => {
    const q = search.toLowerCase().trim()
    return skills.filter(
      (s) =>
        s.status === 'active' &&
        (!q || s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q))
    )
  }, [skills, search])

  const availableSkills = useMemo(() => {
    const q = search.toLowerCase().trim()
    return skills.filter(
      (s) =>
        s.status !== 'active' &&
        (!q || s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q))
    )
  }, [skills, search])

  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-foreground text-2xl font-medium">Skills</h1>
            <p className="mt-1" style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {skills.length} habilidades disponíveis.{' '}
              <span className="text-foreground font-medium">{totalActive} ativas.</span>
            </p>
          </div>
          <div className="bg-muted flex w-52 shrink-0 items-center gap-2 rounded-full px-4 py-2.5">
            <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <input
              type="text"
              placeholder="Buscar skills..."
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

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground text-sm">Carregando skills...</p>
          </div>
        )}

        {/* Active section */}
        {!isLoading && activeSkills.length > 0 && (
          <div className="mb-8">
            <SectionHeading>Ativas</SectionHeading>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {activeSkills.map((skill) => (
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
          </div>
        )}

        {/* Available section */}
        {!isLoading && availableSkills.length > 0 && (
          <div className="mb-10">
            <SectionHeading>Disponíveis</SectionHeading>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {availableSkills.map((skill) => (
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
          </div>
        )}

        {/* Empty search state */}
        {!isLoading && activeSkills.length === 0 && availableSkills.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground text-sm">
              Nenhuma skill encontrada para &ldquo;{search}&rdquo;
            </p>
            <button
              onClick={() => setSearch('')}
              className="mt-2 text-sm font-medium"
              style={{ color: 'var(--green)' }}
            >
              Limpar busca
            </button>
          </div>
        )}

        {/* Brand DNA configuration section */}
        {!search && (
          <div>
            <SectionHeading>Configuração</SectionHeading>
            <Link
              href="/skills/brand-dna"
              className="border-border bg-background hover:border-foreground/25 flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
                style={{ background: 'hsl(270 70% 96%)' }}
              >
                ✨
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-foreground font-medium" style={{ fontSize: 14 }}>
                    Brand DNA
                  </p>
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{
                      background: 'var(--green-bg)',
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--green)',
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: 'var(--green)' }}
                    />
                    Ativo
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  Identidade, tom de voz e posicionamento da marca
                </p>
              </div>
              <span
                style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}
                className="flex shrink-0 items-center gap-1"
              >
                Editar <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
