/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServerClient } from '@/lib/supabase/server'
import { getTeamPlan, hasFeature, canInviteMembers } from '../feature-gate'
import type { TeamPlan } from '../feature-gate'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

function createMockSupabase(overrides: Record<string, any> = {}) {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }

  return {
    from: vi.fn().mockReturnValue(mockChain),
    _chain: mockChain,
  }
}

const FREE_PLAN_FALLBACK: TeamPlan = {
  planId: 'free',
  planName: 'Free',
  features: { invite_members: false, workspace_connections: false },
  stepsLimit: 1000,
  aiCreditsLimit: 100,
  maxTeamMembers: 1,
}

describe('getTeamPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns correct plan data from Supabase join', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        plan_id: 'pro',
        plans: {
          id: 'pro',
          name: 'Pro',
          features: { invite_members: true, workspace_connections: true },
          steps_limit: 10000,
          ai_credits_limit: 1000,
          max_team_members: 10,
        },
      },
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await getTeamPlan('team-1')

    expect(result).toEqual({
      planId: 'pro',
      planName: 'Pro',
      features: { invite_members: true, workspace_connections: true },
      stepsLimit: 10000,
      aiCreditsLimit: 1000,
      maxTeamMembers: 10,
    })
  })

  it('calls Supabase with the correct team id and join query', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        plan_id: 'free',
        plans: {
          id: 'free',
          name: 'Free',
          features: {},
          steps_limit: 1000,
          ai_credits_limit: 100,
          max_team_members: 1,
        },
      },
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    await getTeamPlan('team-abc')

    expect(mockSupabase.from).toHaveBeenCalledWith('teams')
    expect(mockSupabase._chain.select).toHaveBeenCalledWith(
      'plan_id, plans(id, name, features, steps_limit, ai_credits_limit, max_team_members)'
    )
    expect(mockSupabase._chain.eq).toHaveBeenCalledWith('id', 'team-abc')
  })

  it('falls back to free plan when Supabase returns an error', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: null,
      error: { message: 'row not found' },
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await getTeamPlan('team-missing')

    expect(result).toEqual(FREE_PLAN_FALLBACK)
  })

  it('falls back to free plan when data is null (no matching row)', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({ data: null, error: null })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await getTeamPlan('team-null')

    expect(result).toEqual(FREE_PLAN_FALLBACK)
  })

  it('handles enterprise plan data correctly', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        plan_id: 'enterprise',
        plans: {
          id: 'enterprise',
          name: 'Enterprise',
          features: { invite_members: true, workspace_connections: true, sso: true },
          steps_limit: 999999,
          ai_credits_limit: 50000,
          max_team_members: 500,
        },
      },
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await getTeamPlan('team-enterprise')

    expect(result.planId).toBe('enterprise')
    expect(result.maxTeamMembers).toBe(500)
    expect(result.stepsLimit).toBe(999999)
  })

  it('uses fallback field values when plan fields are null', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        plan_id: null,
        plans: {
          id: null,
          name: null,
          features: null,
          steps_limit: null,
          ai_credits_limit: null,
          max_team_members: null,
        },
      },
      error: null,
    })
    ;(createServerClient as any).mockResolvedValue(mockSupabase)

    const result = await getTeamPlan('team-nullish')

    expect(result.planId).toBe('free')
    expect(result.planName).toBe('Free')
    expect(result.features).toEqual({})
    expect(result.stepsLimit).toBe(1000)
    expect(result.aiCreditsLimit).toBe(100)
    expect(result.maxTeamMembers).toBe(1)
  })
})

describe('hasFeature', () => {
  const basePlan: TeamPlan = {
    planId: 'pro',
    planName: 'Pro',
    features: {
      invite_members: true,
      workspace_connections: false,
    },
    stepsLimit: 10000,
    aiCreditsLimit: 1000,
    maxTeamMembers: 10,
  }

  it('returns true when feature flag is true', () => {
    expect(hasFeature(basePlan, 'invite_members')).toBe(true)
  })

  it('returns false when feature flag is false', () => {
    expect(hasFeature(basePlan, 'workspace_connections')).toBe(false)
  })

  it('returns false when feature key does not exist', () => {
    expect(hasFeature(basePlan, 'nonexistent_feature')).toBe(false)
  })

  it('returns false for empty features object', () => {
    const planNoFeatures: TeamPlan = { ...basePlan, features: {} }
    expect(hasFeature(planNoFeatures, 'invite_members')).toBe(false)
  })

  it('does not return true for truthy non-boolean values (strict === true check)', () => {
    const planWithTruthyValue: TeamPlan = {
      ...basePlan,
      features: { some_feature: 1 as unknown as boolean },
    }
    expect(hasFeature(planWithTruthyValue, 'some_feature')).toBe(false)
  })
})

describe('canInviteMembers', () => {
  const proWithInvite: TeamPlan = {
    planId: 'pro',
    planName: 'Pro',
    features: { invite_members: true },
    stepsLimit: 10000,
    aiCreditsLimit: 1000,
    maxTeamMembers: 5,
  }

  const freeNoInvite: TeamPlan = {
    planId: 'free',
    planName: 'Free',
    features: { invite_members: false },
    stepsLimit: 1000,
    aiCreditsLimit: 100,
    maxTeamMembers: 1,
  }

  it('returns true when invite_members is enabled and count is below max', () => {
    expect(canInviteMembers(proWithInvite, 3)).toBe(true)
  })

  it('returns true when count is one below max', () => {
    expect(canInviteMembers(proWithInvite, 4)).toBe(true)
  })

  it('returns false when count equals max (at limit)', () => {
    expect(canInviteMembers(proWithInvite, 5)).toBe(false)
  })

  it('returns false when count exceeds max', () => {
    expect(canInviteMembers(proWithInvite, 10)).toBe(false)
  })

  it('returns false when invite_members feature is disabled regardless of count', () => {
    expect(canInviteMembers(freeNoInvite, 0)).toBe(false)
  })

  it('returns false when invite_members is missing from features', () => {
    const planNoFlag: TeamPlan = { ...proWithInvite, features: {} }
    expect(canInviteMembers(planNoFlag, 0)).toBe(false)
  })

  it('returns false when count is zero and invite_members is disabled', () => {
    expect(canInviteMembers(freeNoInvite, 0)).toBe(false)
  })
})
