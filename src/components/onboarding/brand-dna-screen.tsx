'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useBrandDna } from '@/hooks/use-brand-dna'
import { AssetsDrawer } from '@/components/brand-dna/assets-drawer'

const DEFAULT_SKILLS = [
  {
    slug: 'seasonal-calendar',
    name: 'Seasonal Calendar',
    description: 'Mapeia as melhores datas do ano e gera campanhas com antecedência.',
    dot: 'var(--amber)',
  },
  {
    slug: 'campaign-copywriter',
    name: 'Copywriter',
    description: 'Escreve textos pra todos os canais no tom da marca.',
    dot: 'var(--blue)',
  },
  {
    slug: 'image-generator',
    name: 'Image Generator',
    description: 'Cria banners e criativos com a paleta e estilo da marca.',
    dot: 'var(--purple)',
  },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase"
      style={{ color: '#7a8494' }}
    >
      {children}
    </span>
  )
}

export function BrandDnaScreen() {
  const router = useRouter()
  const { brandDna, isLoading } = useBrandDna()
  const [assetsOpen, setAssetsOpen] = useState(false)
  const [skillToggles, setSkillToggles] = useState<boolean[]>([])

  const toggleSkill = (i: number) =>
    setSkillToggles((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  const handleComplete = async () => {
    const skills =
      Array.isArray(brandDna?.recommended_skills) && brandDna.recommended_skills.length > 0
        ? brandDna.recommended_skills
        : DEFAULT_SKILLS
    const selected = skills
      .filter((_: unknown, i: number) => skillToggles[i] !== false)
      .map((s: { slug?: string }) => s.slug)
      .filter(Boolean)

    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedSkillSlugs: selected }),
      })
    } catch (e) {
      console.error('Failed to complete onboarding:', e)
    }
    router.push('/')
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-background min-h-screen px-4 py-10">
        <div className="mx-auto mb-8 max-w-[640px]">
          <Link
            href="/onboarding/analyzing"
            className="flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-70"
            style={{ color: '#7a8494' }}
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>
        <div className="mx-auto flex max-w-[640px] flex-col gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-muted h-20 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // No data state
  if (!brandDna) {
    return (
      <div className="bg-background min-h-screen px-4 py-10">
        <div className="mx-auto mb-8 max-w-[640px]">
          <Link
            href="/onboarding/analyzing"
            className="flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-70"
            style={{ color: '#7a8494' }}
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>
        <div className="mx-auto flex max-w-[640px] flex-col items-center justify-center gap-4 py-20">
          <p className="text-muted-foreground text-center text-[14px]">
            Nenhuma análise encontrada. Execute o onboarding primeiro.
          </p>
          <Link
            href="/onboarding"
            className="text-primary text-[13px] font-medium transition-opacity hover:opacity-70"
          >
            Ir para o onboarding →
          </Link>
        </div>
      </div>
    )
  }

  // ── Map data ──────────────────────────────────────────────────────────────

  const storeName = brandDna.store_name ?? 'sua loja'
  const greeting = brandDna.greeting ?? `Oi! Sou o Snew, seu novo CMO.`
  const intro =
    brandDna.intro ??
    `Acabei de analisar a ${storeName} de ponta a ponta — catálogo, posicionamento e oportunidades. Deixa eu te mostrar o que eu entendi:`

  const identityDescription = brandDna.positioning ?? 'Análise de posicionamento não disponível.'

  const toneDescription: string =
    (typeof brandDna.tone === 'string' ? brandDna.tone : brandDna.tone?.description) ??
    'Tom de voz não analisado.'

  const wordsToUse: string[] = brandDna.words_to_use ?? brandDna.tone?.wordsToUse ?? []
  const wordsToAvoid: string[] = brandDna.words_to_avoid ?? brandDna.tone?.wordsToAvoid ?? []

  const strengths: Array<string | { title: string; description: string }> =
    brandDna.strengths ?? brandDna.diagnostic?.strengths ?? []
  const alerts: Array<string | { title: string; description: string }> =
    brandDna.alerts ?? brandDna.diagnostic?.alerts ?? []

  const diagnosticItems = [
    ...strengths.map((s) => ({
      status: '✓',
      color: 'var(--green)',
      bg: 'var(--green-bg)',
      text: typeof s === 'string' ? s : `${s.title} — ${s.description}`,
    })),
    ...alerts.map((a) => ({
      status: '!',
      color: 'var(--amber)',
      bg: 'var(--amber-bg)',
      text: typeof a === 'string' ? a : `${a.title} — ${a.description}`,
    })),
  ]

  const rawOpportunities: Array<{ title: string; description: string; color?: string }> =
    Array.isArray(brandDna.opportunities) ? brandDna.opportunities : []
  const opportunities = rawOpportunities.map((opp) => ({
    borderColor: opp.color === 'green' ? 'var(--green)' : 'var(--amber)',
    bg: opp.color === 'green' ? 'var(--green-bg)' : 'var(--amber-bg)',
    label: opp.title,
    text: opp.description,
  }))

  const projection = brandDna.revenue_projection ?? brandDna.projection ?? null

  const rawSkills: Array<{
    slug?: string
    name?: string
    reason?: string
    description?: string
    dot?: string
    color?: string
  }> =
    Array.isArray(brandDna.recommended_skills) && brandDna.recommended_skills.length > 0
      ? brandDna.recommended_skills
      : DEFAULT_SKILLS

  const skills = rawSkills.map((s) => ({
    dot: s.dot ?? 'var(--amber)',
    name: s.name ?? s.slug ?? '',
    desc: s.reason ?? s.description ?? '',
    slug: s.slug ?? '',
  }))

  // Init toggles lazily
  if (skillToggles.length !== skills.length) {
    // use a ref-like trick: set outside render — this is the first render path
  }
  const effectiveToggles = skills.map((_, i) => skillToggles[i] !== false)

  const alertText =
    brandDna.alert ??
    'a Nuvemshop não tem API de e-mail marketing. Vou precisar que vocês conectem o Mailchimp ou RD Station — sem isso, perdemos o canal responsável por ~38% da receita sazonal.'

  // ── Revenue formatting ────────────────────────────────────────────────────

  const formatK = (n: number) => `R$ ${(n / 1000).toFixed(0)}k`

  return (
    <>
      <AssetsDrawer
        open={assetsOpen}
        onClose={() => setAssetsOpen(false)}
        storeName={storeName}
        tone={toneDescription}
        wordsToUse={Array.isArray(wordsToUse) ? wordsToUse : []}
        wordsToAvoid={Array.isArray(wordsToAvoid) ? wordsToAvoid : []}
        positioning={identityDescription}
      />

      <div className="bg-background min-h-screen px-4 py-10">
        {/* Back */}
        <div className="mx-auto mb-8 max-w-[640px]">
          <Link
            href="/onboarding/analyzing"
            className="flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-70"
            style={{ color: '#7a8494' }}
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>

        <div className="mx-auto max-w-[640px] pb-16">
          {/* ── Element 1: CMO Greeting ──────────────────────────────────── */}
          <div className="mb-8 flex gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  background:
                    'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, transparent))',
                  color: 'var(--primary-foreground)',
                }}
              >
                S
              </div>
            </div>
            <div className="flex-1">
              <p className="text-foreground mb-2 text-[16px] leading-snug font-medium">
                {greeting}
              </p>
              <p
                className="text-muted-foreground mb-3 text-[14px] leading-relaxed"
                style={{ lineHeight: 1.6 }}
              >
                {intro}
              </p>
            </div>
          </div>

          {/* ── Element 2: Brand Identity ────────────────────────────────── */}
          <div className="mb-6">
            <SectionLabel>Identidade da marca</SectionLabel>
            <p
              className="text-muted-foreground mb-4 text-[14px] leading-relaxed"
              style={{ lineHeight: 1.6 }}
            >
              {identityDescription}
            </p>
            <button
              onClick={() => setAssetsOpen(true)}
              className="text-primary text-[12px] font-medium transition-opacity hover:opacity-70"
            >
              ver assets →
            </button>
          </div>

          {/* ── Element 3: Voice ─────────────────────────────────────────── */}
          <div className="mb-6">
            <SectionLabel>Tom de voz</SectionLabel>
            <p
              className="text-muted-foreground mb-3 text-[14px] leading-relaxed"
              style={{ lineHeight: 1.6 }}
            >
              {toneDescription}
            </p>
            <div className="flex flex-col gap-2">
              {Array.isArray(wordsToUse) && wordsToUse.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] font-medium" style={{ color: '#7a8494' }}>
                    Usar:
                  </span>
                  {wordsToUse.map((w) => (
                    <span
                      key={w}
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ background: 'var(--green-bg)', color: 'var(--green)' }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              )}
              {Array.isArray(wordsToAvoid) && wordsToAvoid.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] font-medium" style={{ color: '#7a8494' }}>
                    Evitar:
                  </span>
                  {wordsToAvoid.map((w) => (
                    <span
                      key={w}
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
                        color: 'var(--destructive)',
                      }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Element 3.5: CMO Performance Diagnosis ───────────────────── */}
          {diagnosticItems.length > 0 && (
            <div className="mb-6">
              <SectionLabel>Diagnóstico de performance</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {diagnosticItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2"
                    style={{ background: item.bg }}
                  >
                    <span
                      className="mt-[3px] flex-shrink-0 text-[11px] font-bold"
                      style={{ color: item.color }}
                    >
                      {item.status}
                    </span>
                    <p className="text-muted-foreground text-[13px] leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Element 4: What I noticed ────────────────────────────────── */}
          {opportunities.length > 0 && (
            <div className="mb-6">
              <SectionLabel>O que eu identifiquei</SectionLabel>
              <div className="flex flex-col gap-2">
                {opportunities.map((insight, i) => (
                  <div
                    key={i}
                    className="rounded-lg py-2.5 pr-4 pl-3"
                    style={{
                      borderLeft: `3px solid ${insight.borderColor}`,
                      background: insight.bg,
                    }}
                  >
                    <p className="text-foreground mb-0.5 text-[13px] font-semibold">
                      {insight.label}
                    </p>
                    <p className="text-muted-foreground text-[13px] leading-relaxed">
                      {insight.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Element 4.5: Risk alert ──────────────────────────────────── */}
          <div className="mb-6">
            <p
              className="text-muted-foreground text-[13px] leading-relaxed"
              style={{ lineHeight: 1.6 }}
            >
              <strong className="text-foreground">Um alerta:</strong> {alertText}
            </p>
          </div>

          {/* ── Element 5: Impact projection ─────────────────────────────── */}
          {projection && (
            <div className="mb-6">
              <SectionLabel>O que eu projeto</SectionLabel>
              <p
                className="text-muted-foreground mb-1.5 text-[14px] leading-relaxed"
                style={{ lineHeight: 1.6 }}
              >
                Hoje vocês faturam estimados{' '}
                <strong className="text-foreground">{formatK(projection.current ?? 0)}/ano</strong>{' '}
                em datas sazonais. Com o Snew, projeto{' '}
                <strong className="text-foreground">
                  {formatK(projection.projected ?? 0)}/ano
                </strong>{' '}
                — um incremento de{' '}
                <strong style={{ color: 'var(--green)' }}>
                  +
                  {formatK(
                    projection.delta ?? (projection.projected ?? 0) - (projection.current ?? 0)
                  )}
                </strong>{' '}
                vindo de datas que vocês ainda não estão aproveitando.
              </p>
              <p className="text-[12px]" style={{ color: '#7a8494' }}>
                {projection.disclaimer ??
                  'Projeção baseada em benchmarks do nicho. Resultados reais dependem de execução.'}
              </p>
            </div>
          )}

          {/* ── Element 6: What I recommend ──────────────────────────────── */}
          <div className="mb-8">
            <SectionLabel>O que eu recomendo</SectionLabel>
            <p
              className="text-muted-foreground mb-4 text-[14px] leading-relaxed"
              style={{ lineHeight: 1.6 }}
            >
              {skills.length === 1
                ? 'Uma habilidade pra começar. Com ela, gero sua primeira campanha nos próximos minutos:'
                : `${skills.length === 2 ? 'Duas' : 'Três'} habilidades pra começar. Com elas, gero sua primeira campanha nos próximos minutos:`}
            </p>
            <div className="flex flex-col gap-3.5">
              {skills.map((skill, i) => (
                <div key={skill.slug || skill.name || i} className="flex items-start gap-3">
                  <div
                    className="mt-[6px] h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: skill.dot }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-[14px] leading-snug font-semibold">
                      {skill.name}
                    </p>
                    <p className="mt-0.5 text-[13px]" style={{ color: '#7a8494' }}>
                      {skill.desc}
                    </p>
                  </div>
                  <Switch
                    checked={effectiveToggles[i]}
                    onCheckedChange={() => {
                      if (skillToggles.length !== skills.length) {
                        const initial = skills.map(() => true)
                        initial[i] = false
                        setSkillToggles(initial)
                      } else {
                        toggleSkill(i)
                      }
                    }}
                    className="mt-0.5 flex-shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── CTA ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <Button className="h-11 w-full text-[14px] font-medium" onClick={handleComplete}>
              Começar com essas habilidades
            </Button>
            <p className="text-center text-[12px]" style={{ color: '#7a8494' }}>
              Você pode ativar mais habilidades e editar o Brand DNA quando quiser.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
