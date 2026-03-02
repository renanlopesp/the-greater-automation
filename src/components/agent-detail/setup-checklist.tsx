'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export interface SetupStep {
  label: string
  completed: boolean
  action?: {
    label: string
    /** Navigate to this path when clicked */
    href: string
  }
}

interface SetupChecklistProps {
  agentName: string
  steps: SetupStep[]
}

export default function SetupChecklist({ agentName, steps }: SetupChecklistProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  const allComplete = steps.every((s) => s.completed)

  if (dismissed || allComplete) return null

  const completedCount = steps.filter((s) => s.completed).length

  return (
    <Card className="mx-4 mt-3 border-dashed">
      <CardContent className="flex flex-col gap-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="text-muted-foreground h-4 w-4" />
            <p className="text-sm font-medium">
              Set up {agentName}{' '}
              <span className="text-muted-foreground font-normal">
                ({completedCount}/{steps.length})
              </span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-auto px-2 py-1 text-xs"
            onClick={() => setDismissed(true)}
          >
            Dismiss
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="text-muted-foreground h-4 w-4" />
                )}
                <span
                  className={`text-sm ${step.completed ? 'text-muted-foreground line-through' : ''}`}
                >
                  {step.label}
                </span>
              </div>
              {!step.completed && step.action && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => router.push(step.action!.href)}
                >
                  {step.action.label}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
