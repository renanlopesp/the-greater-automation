'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { StoreNameStep } from '@/components/onboarding/store-name-step'
import { SegmentStep } from '@/components/onboarding/segment-step'
import { PlatformStep } from '@/components/onboarding/platform-step'
import { PrioritiesStep } from '@/components/onboarding/priorities-step'
import { TelegramStep } from '@/components/onboarding/telegram-step'
import type { Segment, Platform, Priority } from '@/lib/retail/segment-skills'

type Step = 'name' | 'segment' | 'platform' | 'priorities' | 'telegram' | 'done'

const STEP_ORDER: Step[] = ['name', 'segment', 'platform', 'priorities', 'telegram']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('name')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [storeName, setStoreName] = useState('')
  const [segment, setSegment] = useState<Segment | null>(null)
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [platformUrl, setPlatformUrl] = useState('')
  const [priorities, setPriorities] = useState<Priority[]>([])

  const currentIndex = STEP_ORDER.indexOf(step)
  const isFirstStep = currentIndex === 0
  const canProceed =
    (step === 'name' && storeName.trim().length >= 2) ||
    (step === 'segment' && segment !== null) ||
    (step === 'platform' && platform !== null) ||
    (step === 'priorities' && priorities.length > 0) ||
    step === 'telegram'

  const goBack = () => {
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1])
      setError(null)
    }
  }

  const goNext = async () => {
    if (step === 'priorities') {
      // Submit the form before going to Telegram step
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_name: storeName.trim(),
            segment,
            platform,
            platform_url: platformUrl || undefined,
            priorities,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Erro ao criar loja')
        }
        setStep('telegram')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
      return
    }

    if (step === 'telegram') {
      // Complete onboarding
      router.push('/home')
      return
    }

    if (currentIndex < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentIndex + 1])
      setError(null)
    }
  }

  const finishOnboarding = () => {
    router.push('/home')
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {STEP_ORDER.map((s, i) => (
          <div
            key={s}
            className={`h-2 w-8 rounded-full transition-colors ${
              i <= currentIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="text-center">
        <h1 className="text-muted-foreground text-lg font-semibold">snew</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === 'name' && <StoreNameStep value={storeName} onChange={setStoreName} />}
          {step === 'segment' && <SegmentStep value={segment} onChange={setSegment} />}
          {step === 'platform' && (
            <PlatformStep
              platform={platform}
              platformUrl={platformUrl}
              onPlatformChange={setPlatform}
              onUrlChange={setPlatformUrl}
            />
          )}
          {step === 'priorities' && <PrioritiesStep value={priorities} onChange={setPriorities} />}
          {step === 'telegram' && (
            <TelegramStep onSkip={finishOnboarding} onLinked={finishOnboarding} />
          )}

          {error && (
            <div className="border-destructive/50 bg-destructive/10 text-destructive mt-4 rounded-lg border p-3 text-sm">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {!isFirstStep && step !== 'telegram' ? (
            <Button variant="ghost" onClick={goBack}>
              Voltar
            </Button>
          ) : (
            <div />
          )}
          {step !== 'telegram' && (
            <Button onClick={goNext} disabled={!canProceed || loading}>
              {loading ? 'Criando loja...' : step === 'priorities' ? 'Criar minha loja' : 'Próximo'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
