'use client'

import { Check, Loader2 } from 'lucide-react'
import {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionContent,
  QueueList,
  QueueItem,
} from '@/components/ai-elements/queue'

interface ProgressStep {
  label: string
  done: boolean
}

interface SkillProgressQueueProps {
  skillName: string | null
  steps: ProgressStep[]
}

const SKILL_LABELS: Record<string, string> = {
  'seasonal-calendar': 'Calendário Sazonal',
  copywriter: 'Copywriter',
  'image-generator': 'Image Generator',
  'social-content': 'Social Asset Creator',
}

export function SkillProgressQueue({ skillName, steps }: SkillProgressQueueProps) {
  if (!steps.length) return null

  const completedCount = steps.filter((s) => s.done).length
  const totalCount = steps.length
  const label = SKILL_LABELS[skillName ?? ''] ?? skillName ?? 'Processando'
  const allDone = completedCount === totalCount

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 pb-4">
      <Queue className="gap-0 py-2.5">
        <QueueSection defaultOpen>
          <QueueSectionTrigger className="bg-transparent px-2.5 py-1.5 hover:bg-transparent">
            <span className="flex items-center gap-2 text-xs font-medium">
              {allDone ? (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15">
                  <Check size={10} strokeWidth={3} className="text-emerald-600" />
                </div>
              ) : (
                <Loader2 size={14} className="text-muted-foreground animate-spin" />
              )}
              <span className="text-foreground">{label}</span>
              <span className="text-muted-foreground">
                {completedCount}/{totalCount}
              </span>
            </span>
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList className="mt-1">
              {steps.map((step, i) => (
                <QueueItem key={i} className="flex-row items-center gap-2.5 px-2.5 py-1">
                  {step.done ? (
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                      <Check size={10} strokeWidth={3} className="text-emerald-600" />
                    </div>
                  ) : (
                    <Loader2 size={14} className="text-muted-foreground shrink-0 animate-spin" />
                  )}
                  <span
                    className="text-[13px]"
                    style={{
                      color: step.done ? 'var(--muted-foreground)' : 'var(--foreground)',
                    }}
                  >
                    {step.label}
                  </span>
                </QueueItem>
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  )
}
