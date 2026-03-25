'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOnboardingAnalysis } from '@/hooks/use-onboarding-analysis'

export function AnalyzingScreen() {
  const router = useRouter()
  const { steps, isComplete, error, start, retry } = useOnboardingAnalysis()

  useEffect(() => {
    start()
  }, [start])

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Back */}
      <div>
        <Link
          href="/onboarding/connect"
          className="text-muted-foreground inline-flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-70"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-[24px] leading-tight font-semibold tracking-tight">
          Analyzing your store...
        </h1>
      </div>

      {/* Progress steps */}
      <div className="flex flex-col gap-4">
        {steps.map((step, i) => {
          const isDone = step.status === 'completed'
          const isActive = step.status === 'running'

          return (
            <div
              key={i}
              className="flex items-center gap-3 transition-all duration-300"
              style={{ opacity: step.status === 'pending' ? 0.35 : 1 }}
            >
              {/* Icon */}
              <div
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300"
                style={{
                  background: isDone ? 'var(--green-bg)' : 'var(--muted)',
                  border: isDone ? '1.5px solid var(--green)' : '1.5px solid var(--border)',
                }}
              >
                {isDone ? (
                  <Check size={12} strokeWidth={2.5} style={{ color: 'var(--green)' }} />
                ) : isActive ? (
                  <Loader2 size={12} className="text-muted-foreground animate-spin" />
                ) : (
                  <div className="bg-border h-1.5 w-1.5 rounded-full" />
                )}
              </div>

              {/* Text */}
              <span
                className="text-[14px] transition-all duration-300"
                style={{
                  color: isDone ? 'var(--foreground)' : 'var(--muted-foreground)',
                  fontWeight: isDone ? 500 : 400,
                  opacity: isActive ? 1 : isDone ? 1 : 0.6,
                }}
              >
                {step.message}
              </span>
            </div>
          )
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col gap-3">
          <p className="text-destructive text-[14px]">{error}</p>
          <Button variant="outline" className="h-10 text-[14px]" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {/* Continue button */}
      <div
        className="transition-all duration-500"
        style={{
          opacity: isComplete ? 1 : 0,
          transform: isComplete ? 'translateY(0)' : 'translateY(8px)',
          pointerEvents: isComplete ? 'auto' : 'none',
        }}
      >
        <Button
          className="h-11 w-full text-[14px] font-medium"
          onClick={() => router.push('/onboarding/brand-dna')}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
