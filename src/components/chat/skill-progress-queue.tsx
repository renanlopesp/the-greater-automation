'use client'

import { Loader2 } from 'lucide-react'
import {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
} from '@/components/ai-elements/queue'

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

  const completedCount = steps.filter((s) => s.done).length

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 pb-4">
      <Queue>
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel
              label={skillName ?? 'Processando'}
              count={completedCount}
              icon={
                completedCount < steps.length ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : undefined
              }
            />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {steps.map((step, i) => (
                <QueueItem key={i}>
                  <div className="flex items-center gap-2">
                    <QueueItemIndicator completed={step.done} />
                    <QueueItemContent completed={step.done}>{step.label}</QueueItemContent>
                  </div>
                </QueueItem>
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      </Queue>
    </div>
  )
}
