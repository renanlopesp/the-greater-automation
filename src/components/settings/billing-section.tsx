'use client'

import { useState } from 'react'
import { Check, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { useUsage } from '@/hooks/use-usage'
import type { PlanData } from '@/types/navigation'

interface BillingSectionProps {
  teamId?: string
  stepsUsed: number
  stepsLimit: number
  aiCreditsUsed: number
  aiCreditsLimit: number
  planData: PlanData | null
}

interface PlanCard {
  id: 'free' | 'pro' | 'enterprise'
  name: string
  description: string
  monthlyPrice: string
  yearlyPrice: string
  steps: string
  aiCredits: string
  members: string
  features: string[]
}

const PLANS: PlanCard[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic features for individuals and small teams',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    steps: '300 steps',
    aiCredits: '100 AI credits',
    members: '1 member',
    features: ['300 steps / month', '100 AI credits / month', '1 team member', 'Basic workflows'],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Advanced tools for growing teams',
    monthlyPrice: '$29',
    yearlyPrice: '$23',
    steps: '10,000 steps',
    aiCredits: '1,000 AI credits',
    members: '10 members',
    features: [
      '10,000 steps / month',
      '1,000 AI credits / month',
      '10 team members',
      'Team collaboration',
      'Priority email support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Scalable power for large organizations',
    monthlyPrice: '$99',
    yearlyPrice: '$79',
    steps: '100,000 steps',
    aiCredits: '10,000 AI credits',
    members: '50 members',
    features: [
      '100,000 steps / month',
      '10,000 AI credits / month',
      '50 team members',
      'Team collaboration',
      'Priority support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
]

const PLAN_ORDER: Record<string, number> = { free: 0, pro: 1, enterprise: 2 }

async function handleCheckout(planId: string, interval: 'monthly' | 'yearly') {
  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, interval }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      toast.error(data.error ?? 'Failed to start checkout')
    }
  } catch {
    toast.error('Failed to start checkout')
  }
}

async function handlePortal() {
  try {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      toast.error(data.error ?? 'Failed to open billing portal')
    }
  } catch {
    toast.error('Failed to open billing portal')
  }
}

export default function BillingSection({
  teamId,
  stepsUsed: initialStepsUsed,
  stepsLimit: initialStepsLimit,
  aiCreditsUsed: initialAiCreditsUsed,
  aiCreditsLimit: initialAiCreditsLimit,
  planData,
}: BillingSectionProps) {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')

  const { stepsUsed, stepsLimit, aiCreditsUsed, aiCreditsLimit } = useUsage(teamId, {
    stepsUsed: initialStepsUsed,
    stepsLimit: initialStepsLimit,
    aiCreditsUsed: initialAiCreditsUsed,
    aiCreditsLimit: initialAiCreditsLimit,
  })

  const stepsPercent = stepsLimit > 0 ? Math.min((stepsUsed / stepsLimit) * 100, 100) : 0
  const creditsPercent =
    aiCreditsLimit > 0 ? Math.min((aiCreditsUsed / aiCreditsLimit) * 100, 100) : 0

  const currentPlanId = planData?.planId ?? 'free'
  const currentPlanOrder = PLAN_ORDER[currentPlanId] ?? 0

  const currentPlanCard = PLANS.find((p) => p.id === currentPlanId)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-lg font-semibold">Billing</h2>

      {/* Current plan summary */}
      <div className="bg-muted/50 flex flex-col gap-1 rounded-lg p-4">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Current plan
        </span>
        <span className="text-2xl font-bold">{planData?.planName ?? 'Free'}</span>
        <span className="text-muted-foreground text-sm">
          {currentPlanCard?.description ?? 'Basic features for individuals and small teams'}
        </span>
      </div>

      {/* Cancellation warning */}
      {planData?.cancelAtPeriodEnd && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/30">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Your subscription will be cancelled at the end of the current billing period.
          </p>
        </div>
      )}

      {/* Usage bars */}
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

      {/* Billing interval toggle */}
      <div className="flex items-center gap-1 self-start rounded-lg border p-1">
        <button
          onClick={() => setInterval('monthly')}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            interval === 'monthly'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval('yearly')}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            interval === 'yearly'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Yearly
          <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
            Save 20%
          </span>
        </button>
      </div>

      {/* Plan comparison cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId
          const isUpgrade = PLAN_ORDER[plan.id] > currentPlanOrder

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col gap-4 rounded-xl border p-5',
                isCurrent
                  ? 'border-primary bg-primary/5 ring-primary/20 ring-1'
                  : 'border-border bg-card'
              )}
            >
              {isCurrent && (
                <Badge className="absolute -top-2.5 left-4 text-xs">Current plan</Badge>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold">{plan.name}</span>
                <span className="text-muted-foreground text-xs">{plan.description}</span>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold">
                  {interval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                </span>
                {plan.id !== 'free' && (
                  <span className="text-muted-foreground mb-1 text-sm">/ mo</span>
                )}
              </div>

              <ul className="flex flex-col gap-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="text-primary size-3.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-2">
                {isCurrent ? (
                  planData?.hasStripeSubscription ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void handlePortal()}
                    >
                      Manage subscription
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  )
                ) : isUpgrade ? (
                  <Button className="w-full" onClick={() => void handleCheckout(plan.id, interval)}>
                    Upgrade to {plan.name}
                  </Button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
