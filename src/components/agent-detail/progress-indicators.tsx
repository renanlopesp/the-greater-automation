import { Progress } from '@/components/ui/progress'

interface ProgressIndicatorsProps {
  stepsUsed: number
  stepsLimit: number
  aiCreditsUsed: number
  aiCreditsLimit: number
}

export default function ProgressIndicators({
  stepsUsed,
  stepsLimit,
  aiCreditsUsed,
  aiCreditsLimit,
}: ProgressIndicatorsProps) {
  const stepsPercent = stepsLimit > 0 ? (stepsUsed / stepsLimit) * 100 : 0
  const creditsPercent = aiCreditsLimit > 0 ? (aiCreditsUsed / aiCreditsLimit) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Steps</span>
          <span className="font-medium">
            {stepsUsed} / {stepsLimit}
          </span>
        </div>
        <Progress value={stepsPercent} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">AI credits</span>
          <span className="font-medium">
            {aiCreditsUsed} / {aiCreditsLimit}
          </span>
        </div>
        <Progress value={creditsPercent} />
      </div>
    </div>
  )
}
