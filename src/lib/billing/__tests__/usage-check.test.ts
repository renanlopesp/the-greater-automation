/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { checkUsageLimits } from '../usage-check'

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}))

function createMockSupabase(overrides: Record<string, any> = {}) {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }

  return {
    from: vi.fn().mockReturnValue(mockChain),
    _chain: mockChain,
  }
}

describe('checkUsageLimits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns allowed: true when usage is under both limits', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        steps_used: 500,
        steps_limit: 1000,
        ai_credits_used: 50,
        ai_credits_limit: 100,
        period_start: '2026-02-01T00:00:00Z',
        period_end: '2026-02-28T23:59:59Z',
      },
      error: null,
    })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    const result = await checkUsageLimits('team-1')

    expect(result.allowed).toBe(true)
    expect(result.reason).toBeUndefined()
    expect(result.stepsUsed).toBe(500)
    expect(result.stepsLimit).toBe(1000)
    expect(result.aiCreditsUsed).toBe(50)
    expect(result.aiCreditsLimit).toBe(100)
  })

  it('returns allowed: false with reason when steps are at limit', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        steps_used: 1000,
        steps_limit: 1000,
        ai_credits_used: 50,
        ai_credits_limit: 100,
        period_start: '2026-02-01T00:00:00Z',
        period_end: '2026-02-28T23:59:59Z',
      },
      error: null,
    })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    const result = await checkUsageLimits('team-1')

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Step limit reached for the current billing period')
    expect(result.stepsUsed).toBe(1000)
    expect(result.stepsLimit).toBe(1000)
  })

  it('returns allowed: false with reason when steps exceed limit', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        steps_used: 1500,
        steps_limit: 1000,
        ai_credits_used: 0,
        ai_credits_limit: 100,
        period_start: '2026-02-01T00:00:00Z',
        period_end: '2026-02-28T23:59:59Z',
      },
      error: null,
    })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    const result = await checkUsageLimits('team-1')

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Step limit reached for the current billing period')
  })

  it('returns allowed: false with reason when AI credits are at limit', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        steps_used: 500,
        steps_limit: 1000,
        ai_credits_used: 100,
        ai_credits_limit: 100,
        period_start: '2026-02-01T00:00:00Z',
        period_end: '2026-02-28T23:59:59Z',
      },
      error: null,
    })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    const result = await checkUsageLimits('team-1')

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('AI credit limit reached for the current billing period')
    expect(result.aiCreditsUsed).toBe(100)
    expect(result.aiCreditsLimit).toBe(100)
  })

  it('returns allowed: false with reason when AI credits exceed limit', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        steps_used: 0,
        steps_limit: 1000,
        ai_credits_used: 200,
        ai_credits_limit: 100,
        period_start: '2026-02-01T00:00:00Z',
        period_end: '2026-02-28T23:59:59Z',
      },
      error: null,
    })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    const result = await checkUsageLimits('team-1')

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('AI credit limit reached for the current billing period')
  })

  it('step limit check takes priority over AI credit check', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        steps_used: 1000,
        steps_limit: 1000,
        ai_credits_used: 100,
        ai_credits_limit: 100,
        period_start: '2026-02-01T00:00:00Z',
        period_end: '2026-02-28T23:59:59Z',
      },
      error: null,
    })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    const result = await checkUsageLimits('team-1')

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Step limit reached for the current billing period')
  })

  it('returns allowed: true with zero usage values when no usage row found (error)', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: null,
      error: { message: 'row not found', code: 'PGRST116' },
    })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    const result = await checkUsageLimits('team-new')

    expect(result.allowed).toBe(true)
    expect(result.reason).toBeUndefined()
    expect(result.stepsUsed).toBe(0)
    expect(result.stepsLimit).toBe(0)
    expect(result.aiCreditsUsed).toBe(0)
    expect(result.aiCreditsLimit).toBe(0)
  })

  it('returns allowed: true with zero usage values when data is null (no row)', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({ data: null, error: null })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    const result = await checkUsageLimits('team-no-usage')

    expect(result.allowed).toBe(true)
    expect(result.stepsUsed).toBe(0)
    expect(result.aiCreditsUsed).toBe(0)
  })

  it('handles null field values in usage row with numeric fallbacks', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        steps_used: null,
        steps_limit: null,
        ai_credits_used: null,
        ai_credits_limit: null,
        period_start: '2026-02-01T00:00:00Z',
        period_end: '2026-02-28T23:59:59Z',
      },
      error: null,
    })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    const result = await checkUsageLimits('team-nullish')

    // stepsUsed=0 >= stepsLimit=0 => blocked on steps
    expect(result.allowed).toBe(false)
    expect(result.stepsUsed).toBe(0)
    expect(result.stepsLimit).toBe(0)
    expect(result.aiCreditsUsed).toBe(0)
    expect(result.aiCreditsLimit).toBe(0)
  })

  it('calls Supabase with the correct team_id and filters', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        steps_used: 0,
        steps_limit: 1000,
        ai_credits_used: 0,
        ai_credits_limit: 100,
        period_start: '2026-02-01T00:00:00Z',
        period_end: '2026-02-28T23:59:59Z',
      },
      error: null,
    })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    await checkUsageLimits('team-query-check')

    expect(mockSupabase.from).toHaveBeenCalledWith('usage')
    expect(mockSupabase._chain.select).toHaveBeenCalledWith(
      'steps_used, steps_limit, ai_credits_used, ai_credits_limit, period_start, period_end'
    )
    expect(mockSupabase._chain.eq).toHaveBeenCalledWith('team_id', 'team-query-check')
    expect(mockSupabase._chain.lte).toHaveBeenCalled()
    expect(mockSupabase._chain.gte).toHaveBeenCalled()
  })

  it('uses createServiceRoleClient (not createServerClient) to bypass RLS', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({ data: null, error: null })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    await checkUsageLimits('team-rls-check')

    expect(createServiceRoleClient).toHaveBeenCalled()
  })

  it('returns all fields in result for under-limit usage', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase._chain.single.mockResolvedValue({
      data: {
        steps_used: 100,
        steps_limit: 5000,
        ai_credits_used: 10,
        ai_credits_limit: 500,
        period_start: '2026-02-01T00:00:00Z',
        period_end: '2026-02-28T23:59:59Z',
      },
      error: null,
    })
    ;(createServiceRoleClient as any).mockReturnValue(mockSupabase)

    const result = await checkUsageLimits('team-full-result')

    expect(result).toEqual({
      allowed: true,
      stepsUsed: 100,
      stepsLimit: 5000,
      aiCreditsUsed: 10,
      aiCreditsLimit: 500,
    })
  })
})
