'use client'

import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressStep {
  label: string
  done: boolean
}

interface SkillProgressQueueProps {
  skillName: string | null
  steps: ProgressStep[]
}

export function SkillProgressQueue({ skillName, steps }: SkillProgressQueueProps) {
  if (!steps.length) return null

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 pb-4">
      <div
        className="rounded-xl border px-4 py-3"
        style={{
          borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)',
          background: 'color-mix(in srgb, var(--muted) 30%, transparent)',
        }}
      >
        {skillName && (
          <p
            className="mb-2.5 text-xs font-medium tracking-wider uppercase"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {skillName}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              {step.done ? (
                <div
                  className={cn(
                    'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full'
                  )}
                  style={{
                    background: 'color-mix(in srgb, var(--foreground) 10%, transparent)',
                  }}
                >
                  <Check size={11} strokeWidth={2.5} style={{ color: 'var(--muted-foreground)' }} />
                </div>
              ) : (
                <Loader2
                  size={18}
                  className="shrink-0 animate-spin"
                  style={{ color: 'var(--muted-foreground)' }}
                />
              )}
              <span
                className="text-[13px]"
                style={{
                  color: step.done ? 'var(--muted-foreground)' : 'var(--foreground)',
                }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
