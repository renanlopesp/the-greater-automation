'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { mockBrandDna } from '@/data/mock-brand-dna'
import { BrandIdentityCard } from '@/components/brand-dna/brand-identity-card'
import { ToneOfVoiceCard } from '@/components/brand-dna/tone-of-voice-card'
import { DiagnosticList } from '@/components/brand-dna/diagnostic-list'
import { OpportunitiesList } from '@/components/brand-dna/opportunities-list'
import { RevenueProjection } from '@/components/brand-dna/revenue-projection'
import { SkillActivationList } from '@/components/brand-dna/skill-activation-list'

export function BrandDnaScreen() {
  const router = useRouter()

  const handleComplete = () => {
    router.push('/')
  }

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
          <p className="text-foreground mb-2 text-[16px] leading-snug font-medium">
            {mockBrandDna.greeting}
          </p>
          <p
            className="text-muted-foreground text-[14px] leading-relaxed"
            style={{ lineHeight: 1.6 }}
          >
            {mockBrandDna.intro}
          </p>
        </div>
      </div>

      {/* Element 2: Brand Identity */}
      <BrandIdentityCard description={mockBrandDna.identity.description} />

      {/* Element 3: Tone of Voice */}
      <ToneOfVoiceCard
        description={mockBrandDna.tone.description}
        wordsToUse={mockBrandDna.tone.wordsToUse}
        wordsToAvoid={mockBrandDna.tone.wordsToAvoid}
      />

      {/* Element 4: Diagnostic */}
      <DiagnosticList
        strengths={mockBrandDna.diagnostic.strengths}
        alerts={mockBrandDna.diagnostic.alerts}
      />

      {/* Element 5: Opportunities */}
      <OpportunitiesList
        opportunities={
          mockBrandDna.opportunities as Array<{
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
          <strong className="text-foreground">Um alerta:</strong> {mockBrandDna.alert}
        </p>
      </div>

      {/* Element 7: Revenue Projection */}
      <RevenueProjection
        current={mockBrandDna.projection.current}
        projected={mockBrandDna.projection.projected}
        delta={mockBrandDna.projection.delta}
        disclaimer={mockBrandDna.projection.disclaimer}
      />

      {/* Element 8: Skill Activation */}
      <SkillActivationList skills={mockBrandDna.recommendedSkills} onComplete={handleComplete} />
    </div>
  )
}
