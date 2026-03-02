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
    name: 'Gratuito',
    description: 'Recursos básicos para indivíduos e pequenas equipes',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    steps: '300 etapas',
    aiCredits: '100 créditos IA',
    members: '1 membro',
    features: [
      '300 etapas / mês',
      '100 créditos IA / mês',
      '1 membro da equipe',
      'Automações básicas',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Ferramentas avançadas para equipes em crescimento',
    monthlyPrice: '$29',
    yearlyPrice: '$23',
    steps: '10.000 etapas',
    aiCredits: '1.000 créditos IA',
    members: '10 membros',
    features: [
      '10.000 etapas / mês',
      '1.000 créditos IA / mês',
      '10 membros da equipe',
      'Colaboração em equipe',
      'Suporte por e-mail prioritário',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Poder escalável para grandes organizações',
    monthlyPrice: '$99',
    yearlyPrice: '$79',
    steps: '100.000 etapas',
    aiCredits: '10.000 créditos IA',
    members: '50 membros',
    features: [
      '100.000 etapas / mês',
      '10.000 créditos IA / mês',
      '50 membros da equipe',
      'Colaboração em equipe',
      'Suporte prioritário',
      'Integrações personalizadas',
      'Garantia de SLA',
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
      toast.error(data.error ?? 'Falha ao iniciar pagamento')
    }
  } catch {
    toast.error('Falha ao iniciar pagamento')
  }
}

async function handlePortal() {
  try {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      toast.error(data.error ?? 'Falha ao abrir portal de cobrança')
    }
  } catch {
    toast.error('Falha ao abrir portal de cobrança')
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
      <h2 className="text-lg font-semibold">Cobrança</h2>

      {/* Current plan summary */}
      <div className="bg-muted/50 flex flex-col gap-1 rounded-lg p-4">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Plano atual
        </span>
        <span className="text-2xl font-bold">{planData?.planName ?? 'Gratuito'}</span>
        <span className="text-muted-foreground text-sm">
          {currentPlanCard?.description ?? 'Recursos básicos para indivíduos e pequenas equipes'}
        </span>
      </div>

      {/* Cancellation warning */}
      {planData?.cancelAtPeriodEnd && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/30">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Sua assinatura será cancelada ao final do período de cobrança atual.
          </p>
        </div>
      )}

      {/* Usage bars */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span>Etapas</span>
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
          Mensal
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
          Anual
          <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
            Economize 20%
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
              {isCurrent && <Badge className="absolute -top-2.5 left-4 text-xs">Plano atual</Badge>}

              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold">{plan.name}</span>
                <span className="text-muted-foreground text-xs">{plan.description}</span>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold">
                  {interval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                </span>
                {plan.id !== 'free' && (
                  <span className="text-muted-foreground mb-1 text-sm">/ mês</span>
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
                      Gerenciar assinatura
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Plano atual
                    </Button>
                  )
                ) : isUpgrade ? (
                  <Button className="w-full" onClick={() => void handleCheckout(plan.id, interval)}>
                    Fazer upgrade para {plan.name}
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
