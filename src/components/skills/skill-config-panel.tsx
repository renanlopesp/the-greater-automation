'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkillConfigPanelProps {
  defaultAutonomy?: 'approval' | 'automatic'
  defaultBriefingAdvance?: string
}

export default function SkillConfigPanel({
  defaultAutonomy = 'approval',
  defaultBriefingAdvance = 'D-60',
}: SkillConfigPanelProps) {
  const [autonomy, setAutonomy] = useState<'approval' | 'automatic'>(defaultAutonomy)
  const [briefingAdvance, setBriefingAdvance] = useState(defaultBriefingAdvance)
  const [customDates, setCustomDates] = useState<string[]>([])
  const [addingDate, setAddingDate] = useState(false)
  const [newDate, setNewDate] = useState('')

  function handleAddDate() {
    if (newDate.trim()) {
      setCustomDates((d) => [...d, newDate.trim()])
      setNewDate('')
      setAddingDate(false)
    }
  }

  return (
    <section>
      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        Configuration
      </p>
      <div className="divide-border border-border divide-y overflow-hidden rounded-2xl border">
        {/* Autonomy level */}
        <div className="bg-background p-5">
          <p className="text-foreground mb-1 text-sm font-medium">Autonomy level</p>
          <p className="text-muted-foreground mb-3 text-[13px]">
            {autonomy === 'automatic'
              ? 'Orchestrator triggers Campaign Engine directly at D-60'
              : 'Briefing is generated, you approve before campaign is created'}
          </p>
          <div className="bg-muted flex w-fit items-center gap-1 rounded-xl p-1">
            {(['approval', 'automatic'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setAutonomy(opt)}
                className={cn(
                  'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
                  autonomy === opt
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt === 'approval' ? 'With approval' : 'Automatic'}
              </button>
            ))}
          </div>
        </div>

        {/* Briefing advance */}
        <div className="bg-background p-5">
          <p className="text-foreground mb-3 text-sm font-medium">Briefing advance</p>
          <div className="flex items-center gap-2">
            {['D-90', 'D-60', 'D-45', 'D-30'].map((opt) => (
              <button
                key={opt}
                onClick={() => setBriefingAdvance(opt)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm font-medium transition-all',
                  briefingAdvance === opt
                    ? 'border-border bg-muted text-foreground'
                    : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Custom dates */}
        <div className="bg-background p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-foreground text-sm font-medium">Custom dates</p>
            <button
              onClick={() => setAddingDate(true)}
              className="flex items-center gap-1 text-sm font-medium transition-colors"
              style={{ color: 'var(--blue)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add date
            </button>
          </div>

          {customDates.length === 0 && !addingDate ? (
            <p className="text-muted-foreground text-[13px]">No custom dates added</p>
          ) : (
            <div className="space-y-2">
              {customDates.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[13px]">{d}</span>
                  <button
                    onClick={() => setCustomDates((dates) => dates.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {addingDate && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddDate()
                      if (e.key === 'Escape') setAddingDate(false)
                    }}
                    placeholder="e.g. Black Friday"
                    className="border-border bg-background focus:border-foreground/30 flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none"
                  />
                  <button
                    onClick={handleAddDate}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                    style={{ background: 'var(--blue)' }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
