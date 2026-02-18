import { createServiceRoleClient } from '@/lib/supabase/server'

export interface UsageLimitResult {
  allowed: boolean
  reason?: string
  stepsUsed: number
  stepsLimit: number
  aiCreditsUsed: number
  aiCreditsLimit: number
}

/**
 * Check if a team has remaining usage within their plan limits.
 * Uses the service role client to bypass RLS (called from webhook handlers
 * that don't have user auth context).
 */
export async function checkUsageLimits(teamId: string): Promise<UsageLimitResult> {
  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('usage')
    .select('steps_used, steps_limit, ai_credits_used, ai_credits_limit, period_start, period_end')
    .eq('team_id', teamId)
    .lte('period_start', now)
    .gte('period_end', now)
    .single()

  if (error || !data) {
    // No usage row found — team hasn't used anything yet, allow
    return {
      allowed: true,
      stepsUsed: 0,
      stepsLimit: 0,
      aiCreditsUsed: 0,
      aiCreditsLimit: 0,
    }
  }

  const stepsUsed = data.steps_used ?? 0
  const stepsLimit = data.steps_limit ?? 0
  const aiCreditsUsed = data.ai_credits_used ?? 0
  const aiCreditsLimit = data.ai_credits_limit ?? 0

  if (stepsUsed >= stepsLimit) {
    return {
      allowed: false,
      reason: 'Step limit reached for the current billing period',
      stepsUsed,
      stepsLimit,
      aiCreditsUsed,
      aiCreditsLimit,
    }
  }

  if (aiCreditsUsed >= aiCreditsLimit) {
    return {
      allowed: false,
      reason: 'AI credit limit reached for the current billing period',
      stepsUsed,
      stepsLimit,
      aiCreditsUsed,
      aiCreditsLimit,
    }
  }

  return {
    allowed: true,
    stepsUsed,
    stepsLimit,
    aiCreditsUsed,
    aiCreditsLimit,
  }
}
