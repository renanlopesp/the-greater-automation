'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useBrandDna } from '@/hooks/use-brand-dna'
import { mockBrandDna } from '@/data/mock-brand-dna'
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

  // Error state — fall back to mock data so the screen remains usable
  const data = brandDna ?? mockBrandDna

  // Map DB fields to component props
  const greeting = data.greeting ?? mockBrandDna.greeting
  const intro = data.intro ?? mockBrandDna.intro

  const identityDescription =
    data.positioning ?? data.identity?.description ?? mockBrandDna.identity.description

  const toneDescription = data.tone?.description ?? data.tone ?? mockBrandDna.tone.description
  const wordsToUse = data.words_to_use ?? data.tone?.wordsToUse ?? mockBrandDna.tone.wordsToUse
  const wordsToAvoid =
    data.words_to_avoid ?? data.tone?.wordsToAvoid ?? mockBrandDna.tone.wordsToAvoid

  const strengths =
    data.strengths ?? data.diagnostic?.strengths ?? mockBrandDna.diagnostic.strengths
  const alerts = data.alerts ?? data.diagnostic?.alerts ?? mockBrandDna.diagnostic.alerts

  const opportunities = data.opportunities ?? mockBrandDna.opportunities

  const projection = data.revenue_projection ?? data.projection ?? mockBrandDna.projection

  const recommendedSkills =
    data.recommended_skills ?? data.recommendedSkills ?? mockBrandDna.recommendedSkills

  const alertText = data.alert ?? mockBrandDna.alert

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
          typeof toneDescription === 'string' ? toneDescription : mockBrandDna.tone.description
        }
        wordsToUse={Array.isArray(wordsToUse) ? wordsToUse : mockBrandDna.tone.wordsToUse}
        wordsToAvoid={Array.isArray(wordsToAvoid) ? wordsToAvoid : mockBrandDna.tone.wordsToAvoid}
      />

      {/* Element 4: Diagnostic */}
      <DiagnosticList
        strengths={Array.isArray(strengths) ? strengths : mockBrandDna.diagnostic.strengths}
        alerts={Array.isArray(alerts) ? alerts : mockBrandDna.diagnostic.alerts}
      />

      {/* Element 5: Opportunities */}
      <OpportunitiesList
        opportunities={
          (Array.isArray(opportunities) ? opportunities : mockBrandDna.opportunities) as Array<{
            title: string
            description: string
            color: 'green' | 'amber'
          }>
        }
      />

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
      <RevenueProjection
        current={projection.current ?? mockBrandDna.projection.current}
        projected={projection.projected ?? mockBrandDna.projection.projected}
        delta={projection.delta ?? mockBrandDna.projection.delta}
        disclaimer={projection.disclaimer ?? mockBrandDna.projection.disclaimer}
      />

      {/* Element 8: Skill Activation */}
      <SkillActivationList
        skills={
          Array.isArray(recommendedSkills) ? recommendedSkills : mockBrandDna.recommendedSkills
        }
        onComplete={handleComplete}
      />
    </div>
  )
}
