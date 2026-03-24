'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STEPS = [
  { pending: 'Scanning 1,247 products...', done: '1,247 products scanned' },
  { pending: 'Extracting brand identity...', done: 'Brand DNA generated' },
  { pending: 'Mapping seasonal opportunities...', done: '32 dates mapped' },
]

export function AnalyzingScreen() {
  const router = useRouter()
  const [completed, setCompleted] = useState<number[]>([])
  const [current, setCurrent] = useState(0)
  const [showContinue, setShowContinue] = useState(false)

  useEffect(() => {
    const timings = [1200, 2400, 3600]
    const timers = timings.map((delay, i) =>
      setTimeout(() => {
        setCompleted((prev) => [...prev, i])
        setCurrent(i + 1)
        if (i === STEPS.length - 1) {
          setTimeout(() => setShowContinue(true), 400)
        }
      }, delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

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
        {STEPS.map((step, i) => {
          const isDone = completed.includes(i)
          const isActive = current === i && !isDone

          return (
            <div
              key={i}
              className="flex items-center gap-3 transition-all duration-300"
              style={{ opacity: i > current && !isDone ? 0.35 : 1 }}
            >
              {/* Icon */}
              <div
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300"
                style={{
                  background: isDone ? 'hsl(var(--green-bg))' : 'hsl(var(--muted))',
                  border: isDone
                    ? '1.5px solid hsl(var(--green))'
                    : '1.5px solid hsl(var(--border))',
                }}
              >
                {isDone ? (
                  <Check size={12} strokeWidth={2.5} style={{ color: 'hsl(var(--green))' }} />
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
                  color: isDone
                    ? 'hsl(var(--foreground))'
                    : isActive
                      ? 'hsl(var(--muted-foreground))'
                      : 'hsl(var(--muted-foreground))',
                  fontWeight: isDone ? 500 : 400,
                  opacity: isActive ? 1 : isDone ? 1 : 0.6,
                }}
              >
                {isDone ? step.done : step.pending}
              </span>
            </div>
          )
        })}
      </div>

      {/* Continue button */}
      <div
        className="transition-all duration-500"
        style={{
          opacity: showContinue ? 1 : 0,
          transform: showContinue ? 'translateY(0)' : 'translateY(8px)',
          pointerEvents: showContinue ? 'auto' : 'none',
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
