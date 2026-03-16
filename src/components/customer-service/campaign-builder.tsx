'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const segmentOptions = ['VIP', 'At-risk', 'New', 'Post-delivery', 'Inactive']
const channelOptions = ['WhatsApp', 'Email', 'SMS']
const objectiveOptions = ['Win-back', 'Retention', 'Review collection', 'Upsell', 'Notification']
const toneOptions = ['Friendly', 'Professional', 'Urgent', 'Casual']

const contextChips = [
  'Last purchase summary',
  'Delivery status',
  'Ticket sentiment',
  'Recommended product',
]

export default function CampaignBuilder() {
  const [segment, setSegment] = useState(segmentOptions[0])
  const [channel, setChannel] = useState(channelOptions[0])
  const [objective, setObjective] = useState(objectiveOptions[0])
  const [tone, setTone] = useState(toneOptions[0])
  const [activeChips, setActiveChips] = useState<Set<string>>(
    new Set(['Last purchase summary', 'Delivery status'])
  )

  const toggleChip = (chip: string) => {
    setActiveChips((prev) => {
      const next = new Set(prev)
      if (next.has(chip)) next.delete(chip)
      else next.add(chip)
      return next
    })
  }

  return (
    <div>
      <h2 className="text-foreground mb-4 text-lg font-medium">Campaign Builder</h2>
      <div className="border-border bg-background space-y-5 rounded-xl border p-6">
        {/* Dropdowns row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Segment', value: segment, onChange: setSegment, options: segmentOptions },
            { label: 'Channel', value: channel, onChange: setChannel, options: channelOptions },
            {
              label: 'Objective',
              value: objective,
              onChange: setObjective,
              options: objectiveOptions,
            },
            { label: 'Tone', value: tone, onChange: setTone, options: toneOptions },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-muted-foreground mb-1 block text-[11px]">{field.label}</label>
              <select
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm"
              >
                {field.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* AI context chips */}
        <div>
          <p className="text-muted-foreground mb-2 text-[11px]">AI Context</p>
          <div className="flex flex-wrap gap-2">
            {contextChips.map((chip) => (
              <button
                key={chip}
                onClick={() => toggleChip(chip)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  activeChips.has(chip)
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button className="bg-foreground text-background w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90">
          Generate message
        </button>
      </div>
    </div>
  )
}
