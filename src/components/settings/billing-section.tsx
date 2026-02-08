'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface BillingSectionProps {
  stepsUsed: number
  stepsLimit: number
  aiCreditsUsed: number
  aiCreditsLimit: number
}

export default function BillingSection({
  stepsUsed,
  stepsLimit,
  aiCreditsUsed,
  aiCreditsLimit,
}: BillingSectionProps) {
  const stepsPercent = stepsLimit > 0 ? Math.min((stepsUsed / stepsLimit) * 100, 100) : 0
  const creditsPercent =
    aiCreditsLimit > 0 ? Math.min((aiCreditsUsed / aiCreditsLimit) * 100, 100) : 0

  function handleUpgrade() {
    toast('Upgrade flow coming soon')
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-lg font-semibold">Billing</h2>

      <div className="bg-muted/50 flex flex-col gap-2 rounded-lg p-4">
        <span className="text-sm font-medium">Current plan</span>
        <span className="text-2xl font-bold">Free</span>
        <span className="text-muted-foreground text-sm">
          Basic features for individuals and small teams
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span>Steps</span>
            <span className="text-muted-foreground">
              {stepsUsed.toLocaleString()} / {stepsLimit.toLocaleString()}
            </span>
          </div>
          <Progress value={stepsPercent} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span>AI Credits</span>
            <span className="text-muted-foreground">
              {aiCreditsUsed.toFixed(2)} / {aiCreditsLimit.toFixed(2)}
            </span>
          </div>
          <Progress value={creditsPercent} />
        </div>
      </div>

      <Button className="w-fit" onClick={handleUpgrade}>
        Upgrade plan
      </Button>
    </div>
  )
}
