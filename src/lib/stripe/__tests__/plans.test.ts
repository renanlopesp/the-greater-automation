import { describe, it, expect, vi, beforeEach } from 'vitest'
import { planIdFromPriceId, getPriceId, getAllPriceIds } from '@/lib/stripe/plans'

const ENV_VARS = {
  STRIPE_PRO_MONTHLY_PRICE_ID: 'price_pro_monthly',
  STRIPE_PRO_YEARLY_PRICE_ID: 'price_pro_yearly',
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: 'price_ent_monthly',
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID: 'price_ent_yearly',
}

describe('planIdFromPriceId', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_PRO_MONTHLY_PRICE_ID', ENV_VARS.STRIPE_PRO_MONTHLY_PRICE_ID)
    vi.stubEnv('STRIPE_PRO_YEARLY_PRICE_ID', ENV_VARS.STRIPE_PRO_YEARLY_PRICE_ID)
    vi.stubEnv('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID', ENV_VARS.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID)
    vi.stubEnv('STRIPE_ENTERPRISE_YEARLY_PRICE_ID', ENV_VARS.STRIPE_ENTERPRISE_YEARLY_PRICE_ID)
  })

  it('returns "pro" for pro monthly price ID', () => {
    expect(planIdFromPriceId('price_pro_monthly')).toBe('pro')
  })

  it('returns "pro" for pro yearly price ID', () => {
    expect(planIdFromPriceId('price_pro_yearly')).toBe('pro')
  })

  it('returns "enterprise" for enterprise monthly price ID', () => {
    expect(planIdFromPriceId('price_ent_monthly')).toBe('enterprise')
  })

  it('returns "enterprise" for enterprise yearly price ID', () => {
    expect(planIdFromPriceId('price_ent_yearly')).toBe('enterprise')
  })

  it('returns null for an unknown price ID', () => {
    expect(planIdFromPriceId('price_unknown')).toBeNull()
  })

  it('returns null when env vars are not set', () => {
    vi.stubEnv('STRIPE_PRO_MONTHLY_PRICE_ID', undefined as unknown as string)
    vi.stubEnv('STRIPE_PRO_YEARLY_PRICE_ID', undefined as unknown as string)
    vi.stubEnv('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID', undefined as unknown as string)
    vi.stubEnv('STRIPE_ENTERPRISE_YEARLY_PRICE_ID', undefined as unknown as string)
    expect(planIdFromPriceId('price_pro_monthly')).toBeNull()
  })
})

describe('getPriceId', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_PRO_MONTHLY_PRICE_ID', ENV_VARS.STRIPE_PRO_MONTHLY_PRICE_ID)
    vi.stubEnv('STRIPE_PRO_YEARLY_PRICE_ID', ENV_VARS.STRIPE_PRO_YEARLY_PRICE_ID)
    vi.stubEnv('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID', ENV_VARS.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID)
    vi.stubEnv('STRIPE_ENTERPRISE_YEARLY_PRICE_ID', ENV_VARS.STRIPE_ENTERPRISE_YEARLY_PRICE_ID)
  })

  it('returns null for the free plan regardless of interval', () => {
    expect(getPriceId('free', 'monthly')).toBeNull()
    expect(getPriceId('free', 'yearly')).toBeNull()
  })

  it('returns pro monthly price ID', () => {
    expect(getPriceId('pro', 'monthly')).toBe('price_pro_monthly')
  })

  it('returns pro yearly price ID', () => {
    expect(getPriceId('pro', 'yearly')).toBe('price_pro_yearly')
  })

  it('returns enterprise monthly price ID', () => {
    expect(getPriceId('enterprise', 'monthly')).toBe('price_ent_monthly')
  })

  it('returns enterprise yearly price ID', () => {
    expect(getPriceId('enterprise', 'yearly')).toBe('price_ent_yearly')
  })

  it('returns null for pro monthly when env var is not set', () => {
    vi.stubEnv('STRIPE_PRO_MONTHLY_PRICE_ID', undefined as unknown as string)
    expect(getPriceId('pro', 'monthly')).toBeNull()
  })

  it('returns null for enterprise yearly when env var is not set', () => {
    vi.stubEnv('STRIPE_ENTERPRISE_YEARLY_PRICE_ID', undefined as unknown as string)
    expect(getPriceId('enterprise', 'yearly')).toBeNull()
  })
})

describe('getAllPriceIds', () => {
  it('returns all four configured price IDs', () => {
    vi.stubEnv('STRIPE_PRO_MONTHLY_PRICE_ID', ENV_VARS.STRIPE_PRO_MONTHLY_PRICE_ID)
    vi.stubEnv('STRIPE_PRO_YEARLY_PRICE_ID', ENV_VARS.STRIPE_PRO_YEARLY_PRICE_ID)
    vi.stubEnv('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID', ENV_VARS.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID)
    vi.stubEnv('STRIPE_ENTERPRISE_YEARLY_PRICE_ID', ENV_VARS.STRIPE_ENTERPRISE_YEARLY_PRICE_ID)

    const ids = getAllPriceIds()
    expect(ids).toHaveLength(4)
    expect(ids).toContain('price_pro_monthly')
    expect(ids).toContain('price_pro_yearly')
    expect(ids).toContain('price_ent_monthly')
    expect(ids).toContain('price_ent_yearly')
  })

  it('excludes missing env vars from results', () => {
    vi.stubEnv('STRIPE_PRO_MONTHLY_PRICE_ID', 'price_pro_monthly')
    vi.stubEnv('STRIPE_PRO_YEARLY_PRICE_ID', undefined as unknown as string)
    vi.stubEnv('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID', undefined as unknown as string)
    vi.stubEnv('STRIPE_ENTERPRISE_YEARLY_PRICE_ID', undefined as unknown as string)

    const ids = getAllPriceIds()
    expect(ids).toEqual(['price_pro_monthly'])
  })

  it('returns an empty array when no env vars are set', () => {
    vi.stubEnv('STRIPE_PRO_MONTHLY_PRICE_ID', undefined as unknown as string)
    vi.stubEnv('STRIPE_PRO_YEARLY_PRICE_ID', undefined as unknown as string)
    vi.stubEnv('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID', undefined as unknown as string)
    vi.stubEnv('STRIPE_ENTERPRISE_YEARLY_PRICE_ID', undefined as unknown as string)

    expect(getAllPriceIds()).toEqual([])
  })
})
