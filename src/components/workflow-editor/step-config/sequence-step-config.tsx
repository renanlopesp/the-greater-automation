'use client'

import { Label } from '@/components/ui/label'
import type { SequenceStepConfig } from '@/lib/workflow-editor/step-defaults'

export default function SequenceStepConfigForm({
  config,
}: {
  config: SequenceStepConfig
  onUpdate: (config: SequenceStepConfig) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label className="text-sm font-medium">Sequence Step</Label>
        <p className="text-muted-foreground mt-1 text-xs">
          A reusable group of steps that execute together
        </p>
      </div>

      <div className="bg-muted rounded-lg p-4">
        <p className="text-muted-foreground text-sm">Inline step editing coming soon</p>
        {config.inline_steps.length > 0 && (
          <p className="text-muted-foreground mt-2 text-xs">
            {config.inline_steps.length} inline step{config.inline_steps.length !== 1 ? 's' : ''}{' '}
            configured
          </p>
        )}
      </div>
    </div>
  )
}
