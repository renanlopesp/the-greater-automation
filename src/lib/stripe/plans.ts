export type PlanId = 'free' | 'pro' | 'enterprise'
export type BillingInterval = 'monthly' | 'yearly'

export interface PriceConfig {
  planId: PlanId
  interval: BillingInterval
}

/**
 * Returns the plan ID for a given Stripe price ID, or null if not found.
 */
export function planIdFromPriceId(priceId: string): PlanId | null {
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID
  const proYearly = process.env.STRIPE_PRO_YEARLY_PRICE_ID
  const enterpriseMonthly = process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID
  const enterpriseYearly = process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID

  if (priceId === proMonthly || priceId === proYearly) return 'pro'
  if (priceId === enterpriseMonthly || priceId === enterpriseYearly) return 'enterprise'
  return null
}

/**
 * Returns the Stripe price ID for a given plan and billing interval, or null if not configured.
 */
export function getPriceId(planId: PlanId, interval: BillingInterval): string | null {
  if (planId === 'free') return null

  if (planId === 'pro') {
    return interval === 'monthly'
      ? (process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? null)
      : (process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? null)
  }

  if (planId === 'enterprise') {
    return interval === 'monthly'
      ? (process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ?? null)
      : (process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID ?? null)
  }

  return null
}

/**
 * Returns all configured Stripe price IDs (for validation or webhook routing).
 */
export function getAllPriceIds(): string[] {
  const ids = [
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
  ]
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
}
