'use client'

import { Check, Loader2 } from 'lucide-react'
import { Queue } from '@/components/ai-elements/queue'

interface ProgressStep {
  label: string
  done: boolean
}

interface SkillProgressQueueProps {
  skillName: string | null
  steps: ProgressStep[]
  done?: boolean
}

const SKILL_LABELS: Record<string, string> = {
  'seasonal-calendar': 'Calendário Sazonal',
  copywriter: 'Copywriter',
  'image-generator': 'Image Generator',
  'social-content': 'Social Asset Creator',
}

export function SkillProgressQueue({ skillName, steps, done }: SkillProgressQueueProps) {
  const label = SKILL_LABELS[skillName ?? ''] ?? skillName ?? 'Processando'

  // Completed state — compact, no fake steps
  if (done) {
    return (
      <div className="mx-auto w-full max-w-[680px] px-4 pb-4">
        <Queue className="gap-0 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15">
              <Check size={10} strokeWidth={3} className="text-emerald-600" />
            </div>
            <span className="text-muted-foreground">{label} gerado</span>
          </div>
        </Queue>
      </div>
    )
  }

  // Running state — show real steps
  if (!steps.length) return null

  const completedCount = steps.filter((s) => s.done).length
  const totalCount = steps.length

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 pb-4">
      <Queue className="gap-0 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 size={14} className="text-muted-foreground animate-spin" />
          <span className="text-foreground">{label}</span>
          <span className="text-muted-foreground text-xs">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-1.5 pl-0.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              {step.done ? (
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <Check size={10} strokeWidth={3} className="text-emerald-600" />
                </div>
              ) : (
                <Loader2 size={14} className="text-muted-foreground shrink-0 animate-spin" />
              )}
              <span
                className="text-[13px]"
                style={{ color: step.done ? 'var(--muted-foreground)' : 'var(--foreground)' }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </Queue>
    </div>
  )
}
