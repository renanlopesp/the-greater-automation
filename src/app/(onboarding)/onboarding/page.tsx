'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { StoreNameStep } from '@/components/onboarding/store-name-step'
import { SegmentStep } from '@/components/onboarding/segment-step'
import { PlatformStep } from '@/components/onboarding/platform-step'
import { TelegramStep } from '@/components/onboarding/telegram-step'
import type { Segment, Platform } from '@/lib/retail/segment-skills'

type Step = 'name' | 'segment' | 'platform' | 'telegram' | 'done'

const STEP_ORDER: Step[] = ['name', 'segment', 'platform', 'telegram']
const STORAGE_KEY = 'snew_onboarding_state'

interface SavedState {
  storeName: string
  segment: Segment | null
  platform: Platform | null
  platformUrl: string
  step: Step
  nuvemshopConnected: boolean
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('name')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [storeName, setStoreName] = useState('')
  const [segment, setSegment] = useState<Segment | null>(null)
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [platformUrl, setPlatformUrl] = useState('')
  const [nuvemshopConnected, setNuvemshopConnected] = useState(false)

  // Restore state from sessionStorage after OAuth redirect
  useEffect(() => {
    const connected = searchParams.get('connected')
    const saved = sessionStorage.getItem(STORAGE_KEY)

    if (saved) {
      try {
        const state: SavedState = JSON.parse(saved)
        setStoreName(state.storeName)
        setSegment(state.segment)
        setPlatform(state.platform)
        setPlatformUrl(state.platformUrl)
        setStep(state.step)
        if (state.nuvemshopConnected || connected === 'nuvemshop') {
          setNuvemshopConnected(true)
        }
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        // Ignore parse errors
      }
    }

    if (connected) {
      setNuvemshopConnected(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('connected')
      router.replace(url.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentIndex = STEP_ORDER.indexOf(step)
  const isFirstStep = currentIndex === 0
  const canProceed =
    (step === 'name' && storeName.trim().length >= 2) ||
    (step === 'segment' && segment !== null) ||
    (step === 'platform' && platform === 'nuvemshop' && nuvemshopConnected) ||
    (step === 'platform' && platform === 'shopify' && platformUrl.trim().length > 0) ||
    (step === 'platform' && platform === 'manual') ||
    step === 'telegram'

  const goBack = () => {
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1])
      setError(null)
    }
  }

  const handleConnectNuvemshop = () => {
    const state: SavedState = {
      storeName,
      segment,
      platform,
      platformUrl,
      step: 'platform',
      nuvemshopConnected: false,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.location.href = '/api/nuvemshop/connect?redirect_uri=/onboarding?connected=nuvemshop'
  }

  const goNext = async () => {
    if (step === 'platform') {
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
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Falha ao criar loja')
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
      router.push('/dashboard')
      return
    }

    if (currentIndex < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentIndex + 1])
      setError(null)
    }
  }

  const finishOnboarding = () => {
    router.push('/workspace')
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
              nuvemshopConnected={nuvemshopConnected}
              onPlatformChange={setPlatform}
              onUrlChange={setPlatformUrl}
              onConnectNuvemshop={handleConnectNuvemshop}
            />
          )}
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
              {loading ? 'Criando loja...' : step === 'platform' ? 'Criar minha loja' : 'Próximo'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  )
}
