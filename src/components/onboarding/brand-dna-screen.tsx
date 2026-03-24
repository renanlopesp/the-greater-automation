'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useBrandDna } from '@/hooks/use-brand-dna'
// Mock data removed — all data comes from useBrandDna() hook (real DB data)
import { BrandIdentityCard } from '@/components/brand-dna/brand-identity-card'
import { ToneOfVoiceCard } from '@/components/brand-dna/tone-of-voice-card'
import { DiagnosticList } from '@/components/brand-dna/diagnostic-list'
import { OpportunitiesList } from '@/components/brand-dna/opportunities-list'
import { RevenueProjection } from '@/components/brand-dna/revenue-projection'
import { SkillActivationList } from '@/components/brand-dna/skill-activation-list'

export function BrandDnaScreen() {
  const router = useRouter()
  const { brandDna, isLoading } = useBrandDna()

  const handleComplete = async (selectedSlugs: string[]) => {
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedSkillSlugs: selectedSlugs }),
      })
      router.push('/')
    } catch (e) {
      console.error('Failed to complete onboarding:', e)
      router.push('/')
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="w-full pb-16">
        <div className="mb-8">
          <Link
            href="/onboarding/analyzing"
            className="text-muted-foreground inline-flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-70"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>
        <div className="flex flex-col gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-muted h-20 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // Use real data from DB — generate fallbacks from store_name, never from Milkes mock
  const data = brandDna ?? {}

  const storeName = data.store_name ?? 'sua loja'
  const greeting = data.greeting ?? `Oi! Sou o Snew, seu novo CMO.`
  const intro =
    data.intro ??
    `Acabei de analisar a ${storeName} de ponta a ponta — catálogo, posicionamento e oportunidades. Deixa eu te mostrar o que eu entendi:`

  const identityDescription = data.positioning ?? 'Análise de posicionamento não disponível.'

  const toneDescription =
    (typeof data.tone === 'string' ? data.tone : data.tone?.description) ??
    'Tom de voz não analisado.'
  const wordsToUse = data.words_to_use ?? data.tone?.wordsToUse ?? []
  const wordsToAvoid = data.words_to_avoid ?? data.tone?.wordsToAvoid ?? []

  const strengths = data.strengths ?? data.diagnostic?.strengths ?? []
  const alerts = data.alerts ?? data.diagnostic?.alerts ?? []

  const opportunities = data.opportunities ?? []

  const projection = data.revenue_projection ?? data.projection ?? null

  const recommendedSkills = data.recommended_skills ??
    data.recommendedSkills ?? [
      {
        slug: 'seasonal-calendar',
        name: 'Seasonal Calendar',
        description: 'Mapeia as melhores datas do ano e gera campanhas com antecedência.',
        color: '#D7733E',
      },
      {
        slug: 'campaign-copywriter',
        name: 'Copywriter',
        description: 'Escreve textos pra todos os canais no tom da marca.',
        color: '#648EE9',
      },
      {
        slug: 'image-generator',
        name: 'Image Generator',
        description: 'Cria banners e criativos com a paleta e estilo da marca.',
        color: '#9B6BC4',
      },
    ]

  const alertText =
    data.alert ??
    'Conecte ferramentas de e-mail marketing (Mailchimp, RD Station) para maximizar o impacto das campanhas sazonais.'

  return (
    <div className="w-full pb-16">
      {/* Back */}
      <div className="mb-8">
        <Link
          href="/onboarding/analyzing"
          className="text-muted-foreground inline-flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-70"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
      </div>

      {/* Element 1: CMO Greeting */}
      <div className="mb-8 flex gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <div
            className="text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
            }}
          >
            S
          </div>
        </div>
        <div className="flex-1">
          <p className="text-foreground mb-2 text-[16px] leading-snug font-medium">{greeting}</p>
          <p
            className="text-muted-foreground text-[14px] leading-relaxed"
            style={{ lineHeight: 1.6 }}
          >
            {intro}
          </p>
        </div>
      </div>

      {/* Element 2: Brand Identity */}
      <BrandIdentityCard description={identityDescription} />

      {/* Element 3: Tone of Voice */}
      <ToneOfVoiceCard
        description={
          typeof toneDescription === 'string' ? toneDescription : 'Tom de voz não analisado.'
        }
        wordsToUse={Array.isArray(wordsToUse) ? wordsToUse : []}
        wordsToAvoid={Array.isArray(wordsToAvoid) ? wordsToAvoid : []}
      />

      {/* Element 4: Diagnostic */}
      <DiagnosticList
        strengths={Array.isArray(strengths) ? strengths : []}
        alerts={Array.isArray(alerts) ? alerts : []}
      />

      {/* Element 5: Opportunities */}
      {Array.isArray(opportunities) && opportunities.length > 0 && (
        <OpportunitiesList
          opportunities={
            opportunities as Array<{ title: string; description: string; color: 'green' | 'amber' }>
          }
        />
      )}

      {/* Element 6: Alert */}
      <div className="mb-6">
        <p
          className="text-muted-foreground text-[13px] leading-relaxed"
          style={{ lineHeight: 1.6 }}
        >
          <strong className="text-foreground">Um alerta:</strong> {alertText}
        </p>
      </div>

      {/* Element 7: Revenue Projection */}
      {projection && (
        <RevenueProjection
          current={projection.current ?? 0}
          projected={projection.projected ?? 0}
          delta={projection.delta ?? 0}
          disclaimer={projection.disclaimer ?? 'Projeção baseada em benchmarks do nicho.'}
        />
      )}

      {/* Element 8: Skill Activation */}
      <SkillActivationList
        skills={Array.isArray(recommendedSkills) ? recommendedSkills : []}
        onComplete={handleComplete}
      />
    </div>
  )
}
