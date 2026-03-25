'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { motion, AnimatePresence } from 'framer-motion'
import { useBrandDna } from '@/hooks/use-brand-dna'
import { AssetsDrawer } from '@/components/brand-dna/assets-drawer'

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_CARDS = 6

const DEFAULT_SKILLS = [
  { slug: 'seasonal-calendar', name: 'Seasonal Calendar', dot: 'var(--amber)' },
  { slug: 'campaign-copywriter', name: 'Copywriter', dot: 'var(--blue)' },
  { slug: 'image-generator', name: 'Image Generator', dot: 'var(--purple)' },
]

const COLOR_SWATCHES = [
  { hex: '#F4E8D0', label: 'Vanilla' },
  { hex: '#E8D5C0', label: 'Nude' },
  { hex: '#D4B896', label: 'Caramelo' },
  { hex: '#F5F0EB', label: 'Off-white' },
  { hex: '#C9A87C', label: 'Dourado suave' },
]

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-4 text-center text-[11px] font-semibold tracking-[0.08em] uppercase"
      style={{ color: 'var(--color-text-tertiary)' }}
    >
      {children}
    </p>
  )
}

// ─── Card 1: Greeting ─────────────────────────────────────────────────────────

interface Card1Props {
  ownerName: string
  greeting: string
  intro: string
}

function Card1({ ownerName, greeting, intro }: Card1Props) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold"
        style={{
          background:
            'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, transparent))',
          color: 'var(--primary-foreground)',
          boxShadow:
            '0 0 0 2px var(--background), 0 0 0 4px color-mix(in srgb, var(--primary) 25%, transparent)',
        }}
      >
        S
      </div>
      <p
        className="mb-2 text-center text-[18px] font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {greeting || `Oi, ${ownerName}.`}
      </p>
      <p
        className="mb-6 text-center text-[16px] font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Sou o Snew, seu novo CMO.
      </p>
      <p
        className="text-center text-[14px] leading-relaxed"
        style={{ color: 'var(--color-text-secondary)', maxWidth: 400, lineHeight: 1.6 }}
      >
        {intro}
      </p>
    </div>
  )
}

// ─── Card 2: Brand Identity ───────────────────────────────────────────────────

interface Card2Props {
  positioning: string
  onOpenAssets: () => void
}

function Card2({ positioning, onOpenAssets }: Card2Props) {
  return (
    <div className="flex flex-col items-center">
      <CardLabel>Identidade da marca</CardLabel>
      <p
        className="mb-6 text-center text-[14px] leading-relaxed"
        style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
      >
        {positioning}
      </p>
      <div className="mb-3 flex justify-center gap-2">
        {COLOR_SWATCHES.map((s) => (
          <div
            key={s.hex}
            title={`${s.label} · ${s.hex}`}
            className="h-8 w-8 flex-shrink-0 rounded-lg"
            style={{
              background: s.hex,
              border: '1px solid var(--color-border-tertiary)',
            }}
          />
        ))}
      </div>
      <p className="mb-5 text-center text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
        Paleta terrosa e acolhedora. Premium emocional.
      </p>
      <button
        onClick={onOpenAssets}
        className="text-[12px] font-medium transition-opacity hover:opacity-70"
        style={{ color: 'var(--primary)' }}
      >
        ver assets →
      </button>
    </div>
  )
}

// ─── Card 3: Tone of Voice ────────────────────────────────────────────────────

interface Card3Props {
  toneDescription: string
  wordsToUse: string[]
  wordsToAvoid: string[]
}

function Card3({ toneDescription, wordsToUse, wordsToAvoid }: Card3Props) {
  return (
    <div className="flex flex-col items-center">
      <CardLabel>Tom de voz</CardLabel>
      <p
        className="mb-6 text-center text-[14px] leading-relaxed"
        style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
      >
        {toneDescription}
      </p>
      <div className="flex flex-col items-center gap-2">
        {wordsToUse.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span
              className="mr-1 text-[12px] font-medium"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
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
        {wordsToAvoid.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span
              className="mr-1 text-[12px] font-medium"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
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
  )
}

// ─── Card 4: Biggest Opportunity ─────────────────────────────────────────────

interface Card4Props {
  opportunityTitle: string
  opportunityDescription: string
  revenueValue: string | null
}

function Card4({ opportunityTitle, opportunityDescription, revenueValue }: Card4Props) {
  return (
    <div className="flex flex-col items-center">
      <CardLabel>Maior oportunidade</CardLabel>
      <p
        className="mb-2 text-center text-[18px] font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {opportunityTitle}
      </p>
      <p
        className="mb-8 text-center text-[14px] leading-relaxed"
        style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
      >
        {opportunityDescription}
      </p>
      {revenueValue && (
        <div className="text-center">
          <p className="text-[28px] font-bold" style={{ color: 'var(--primary)' }}>
            {revenueValue}
          </p>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
            receita potencial estimada
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Card 5: Additional Insights ─────────────────────────────────────────────

interface InsightItem {
  dot: string
  title: string
  desc: string
}

interface Card5Props {
  items: InsightItem[]
}

function Card5({ items }: Card5Props) {
  return (
    <div className="flex flex-col">
      <CardLabel>Também identifiquei</CardLabel>
      <div className="flex flex-col gap-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: item.dot }}
            />
            <div>
              <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {item.title}
              </p>
              <p
                className="text-[13px] leading-snug"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Card 6: Skills Recommendation ───────────────────────────────────────────

interface SkillItem {
  slug: string
  name: string
  dot: string
}

interface Card6Props {
  skills: SkillItem[]
  toggles: boolean[]
  onToggle: (i: number) => void
  onComplete: () => void
  isCompleting: boolean
  onViewBrandDna: () => void
}

function Card6({
  skills,
  toggles,
  onToggle,
  onComplete,
  isCompleting,
  onViewBrandDna,
}: Card6Props) {
  return (
    <div className="flex flex-col items-center">
      <CardLabel>Minha recomendação</CardLabel>
      <p
        className="mb-6 text-center text-[14px] leading-relaxed"
        style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
      >
        {skills.length === 1
          ? 'Uma habilidade pra começar. Com ela, gero sua primeira campanha nos próximos minutos.'
          : `${skills.length === 2 ? 'Duas' : 'Três'} habilidades pra começar. Com elas, gero sua primeira campanha nos próximos minutos.`}
      </p>
      <div className="mb-8 flex w-full flex-col gap-3">
        {skills.map((s, i) => (
          <div key={s.slug} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.dot }} />
              <span
                className="text-[14px] font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {s.name}
              </span>
            </div>
            <Switch checked={toggles[i] ?? true} onCheckedChange={() => onToggle(i)} />
          </div>
        ))}
      </div>
      <button
        className="mb-3 w-full rounded-xl py-3 text-[14px] font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{
          background: 'var(--color-text-primary)',
          color: 'var(--background)',
        }}
        onClick={onComplete}
        disabled={isCompleting}
      >
        {isCompleting ? 'Iniciando...' : 'Começar com essas habilidades'}
      </button>
      <p className="text-center text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
        Você pode editar o Brand DNA e ativar mais habilidades quando quiser.
      </p>
      <button
        className="mt-3 text-[12px] transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-text-tertiary)' }}
        onClick={onViewBrandDna}
      >
        Ver Brand DNA completo →
      </button>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: 'var(--background)' }}
    >
      <div className="flex w-full flex-col items-center gap-5 px-4" style={{ maxWidth: 560 }}>
        <div
          className="w-full animate-pulse rounded-2xl"
          style={{
            background: 'var(--color-surface-elevated)',
            border: '0.5px solid var(--color-border-tertiary)',
            padding: '40px',
            minHeight: 360,
          }}
        />
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-full"
              style={{
                width: i === 0 ? 20 : 8,
                height: 8,
                background: 'var(--color-border-secondary)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── No data state ────────────────────────────────────────────────────────────

function NoDataState({ onGoBack }: { onGoBack: () => void }) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: 'var(--background)' }}
    >
      <p className="mb-4 text-center text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
        Nenhuma análise encontrada. Execute o onboarding primeiro.
      </p>
      <button
        onClick={onGoBack}
        className="text-[13px] font-medium transition-opacity hover:opacity-70"
        style={{ color: 'var(--primary)' }}
      >
        Ir para o onboarding →
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BrandDnaScreen() {
  const router = useRouter()
  const { brandDna, isLoading } = useBrandDna()

  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const [skillToggles, setSkillToggles] = useState<boolean[]>([])
  const [isCompleting, setIsCompleting] = useState(false)

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= TOTAL_CARDS) return
      setDirection(index > current ? 1 : -1)
      setCurrent(index)
    },
    [current]
  )

  const goNext = useCallback(() => goTo(current + 1), [current, goTo])
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev])

  // Touch/swipe
  useEffect(() => {
    let startX = 0
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
    }
    const onTouchEnd = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX
      if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev()
    }
    window.addEventListener('touchstart', onTouchStart)
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [goNext, goPrev])

  // ── Early returns ───────────────────────────────────────────────────────────

  if (isLoading) return <LoadingSkeleton />
  if (!brandDna) return <NoDataState onGoBack={() => router.push('/onboarding')} />

  // ── Data mapping ────────────────────────────────────────────────────────────

  const storeName = brandDna.store_name ?? 'sua loja'
  const ownerName = brandDna.owner_name ?? storeName
  const greeting = brandDna.greeting ?? `Oi, ${ownerName}.`
  const intro =
    brandDna.intro ??
    `Acabei de analisar a ${storeName} de ponta a ponta. Seu catálogo, seu site, seu posicionamento e oportunidades. Deixa eu te mostrar o que eu entendi:`

  const identityDescription =
    brandDna.positioning ?? 'Análise de identidade da marca não disponível.'

  const toneDescription: string =
    (typeof brandDna.tone === 'string' ? brandDna.tone : brandDna.tone?.description) ??
    'Tom de voz não analisado.'

  const wordsToUse: string[] = brandDna.words_to_use ?? brandDna.tone?.wordsToUse ?? []
  const wordsToAvoid: string[] = brandDna.words_to_avoid ?? brandDna.tone?.wordsToAvoid ?? []

  // Card 4: first opportunity is the "biggest"
  const rawOpportunities: Array<{
    title: string
    description: string
    color?: string
    estimated_revenue?: number
  }> = Array.isArray(brandDna.opportunities) ? brandDna.opportunities : []

  const biggestOpp = rawOpportunities[0]
  const biggestOppTitle = biggestOpp?.title ?? 'Oportunidade principal'
  const biggestOppDesc = biggestOpp?.description ?? 'Análise de oportunidades não disponível.'

  const estimatedRevenue =
    biggestOpp?.estimated_revenue ?? brandDna.revenue_projection?.delta ?? null
  const revenueValue = estimatedRevenue ? `R$ ${(estimatedRevenue / 1000).toFixed(0)}k` : null

  // Card 5: remaining opportunities + strengths/alerts as insights
  const remainingOpps = rawOpportunities.slice(1)
  const strengths: Array<string | { title: string; description: string }> =
    brandDna.strengths ?? brandDna.diagnostic?.strengths ?? []
  const alerts: Array<string | { title: string; description: string }> =
    brandDna.alerts ?? brandDna.diagnostic?.alerts ?? []

  const dotColors = ['var(--green)', 'var(--amber)', 'var(--amber)']
  const insightItems: Array<{ dot: string; title: string; desc: string }> = (() => {
    if (remainingOpps.length >= 3) {
      return remainingOpps.slice(0, 3).map((o, i) => ({
        dot: o.color === 'green' ? 'var(--green)' : (dotColors[i] ?? 'var(--amber)'),
        title: o.title,
        desc: o.description,
      }))
    }
    const combined: Array<{ dot: string; title: string; desc: string }> = [
      ...remainingOpps.map((o, i) => ({
        dot: o.color === 'green' ? 'var(--green)' : (dotColors[i] ?? 'var(--amber)'),
        title: o.title,
        desc: o.description,
      })),
      ...strengths.slice(0, 2).map((s) => ({
        dot: 'var(--green)',
        title: typeof s === 'string' ? s : s.title,
        desc: typeof s === 'string' ? '' : s.description,
      })),
      ...alerts.slice(0, 1).map((a) => ({
        dot: 'var(--amber)',
        title: typeof a === 'string' ? a : a.title,
        desc: typeof a === 'string' ? '' : a.description,
      })),
    ]
    return combined.slice(0, 3)
  })()

  // Card 6: skills
  const rawSkills =
    Array.isArray(brandDna.recommended_skills) && brandDna.recommended_skills.length > 0
      ? brandDna.recommended_skills
      : DEFAULT_SKILLS

  const skills: SkillItem[] = rawSkills.map(
    (s: { slug?: string; name?: string; dot?: string; color?: string }) => ({
      slug: s.slug ?? '',
      name: s.name ?? s.slug ?? '',
      dot: s.dot ?? s.color ?? 'var(--amber)',
    })
  )

  // Sync toggles length with skills
  const effectiveToggles = skills.map((_, i) => skillToggles[i] !== false)

  const handleToggle = (i: number) => {
    const base = skills.map((_, idx) => skillToggles[idx] !== false)
    base[i] = !base[i]
    setSkillToggles(base)
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    const selected = skills
      .filter((_, i) => effectiveToggles[i])
      .map((s) => s.slug)
      .filter(Boolean)

    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedSkillSlugs: selected }),
      })
      if (!res.ok) {
        console.error('Failed to complete onboarding:', res.status)
        setIsCompleting(false)
        return
      }
      router.push('/')
    } catch (e) {
      console.error('Failed to complete onboarding:', e)
      setIsCompleting(false)
    }
  }

  // ── Cards ───────────────────────────────────────────────────────────────────

  const cards = [
    <Card1 key="card1" ownerName={ownerName} greeting={greeting} intro={intro} />,
    <Card2
      key="card2"
      positioning={identityDescription}
      onOpenAssets={() => setAssetsOpen(true)}
    />,
    <Card3
      key="card3"
      toneDescription={toneDescription}
      wordsToUse={wordsToUse}
      wordsToAvoid={wordsToAvoid}
    />,
    <Card4
      key="card4"
      opportunityTitle={biggestOppTitle}
      opportunityDescription={biggestOppDesc}
      revenueValue={revenueValue}
    />,
    <Card5
      key="card5"
      items={
        insightItems.length > 0
          ? insightItems
          : [
              {
                dot: 'var(--green)',
                title: 'Análise em andamento',
                desc: 'Os insights adicionais serão exibidos aqui.',
              },
            ]
      }
    />,
    <Card6
      key="card6"
      skills={skills}
      toggles={effectiveToggles}
      onToggle={handleToggle}
      onComplete={handleComplete}
      isCompleting={isCompleting}
      onViewBrandDna={() => router.push('/settings/brand-dna')}
    />,
  ]

  // ── Render ──────────────────────────────────────────────────────────────────

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

      <div
        className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'var(--background)' }}
      >
        {/* Step dots */}
        <div className="absolute top-6 right-0 left-0 z-10 flex justify-center gap-2">
          {Array.from({ length: TOTAL_CARDS }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === current ? 20 : 8,
                height: 8,
                background:
                  i === current
                    ? 'var(--primary)'
                    : i < current
                      ? 'color-mix(in srgb, var(--primary) 40%, transparent)'
                      : 'var(--color-border-secondary)',
              }}
              aria-label={`Ir para o cartão ${i + 1}`}
            />
          ))}
        </div>

        {/* Card + nav */}
        <div className="flex w-full flex-col items-center gap-5 px-4" style={{ maxWidth: 560 }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="w-full"
              style={{ maxWidth: 520 }}
            >
              <div
                className="w-full rounded-2xl"
                style={{
                  background: 'var(--background)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  padding: '40px',
                  minHeight: 360,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                {cards[current]}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Prev / Next buttons — visible on all cards except last */}
          {current < TOTAL_CARDS - 1 && (
            <div className="flex w-full items-center gap-3" style={{ maxWidth: 520 }}>
              {current > 0 && (
                <button
                  onClick={goPrev}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] transition-opacity hover:opacity-70"
                  style={{
                    background: 'var(--color-surface-raised)',
                    border: '0.5px solid var(--color-border-secondary)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <ChevronLeft size={14} />
                  Anterior
                </button>
              )}
              <button
                onClick={goNext}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium transition-opacity hover:opacity-90"
                style={{
                  background: 'var(--color-text-primary)',
                  color: 'var(--background)',
                }}
              >
                Próximo
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
