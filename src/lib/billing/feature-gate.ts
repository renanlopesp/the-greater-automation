import { createServerClient } from '@/lib/supabase/server'

export type PlanId = 'free' | 'pro' | 'enterprise'

export interface TeamPlan {
  planId: PlanId
  planName: string
  features: Record<string, boolean>
  stepsLimit: number
  aiCreditsLimit: number
  maxTeamMembers: number
}

/**
 * Get the plan details for a team by joining teams → plans.
 * Uses the server client (respects RLS).
 */
export async function getTeamPlan(teamId: string): Promise<TeamPlan> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('teams')
    .select('plan_id, plans(id, name, features, steps_limit, ai_credits_limit, max_team_members)')
    .eq('id', teamId)
    .single()

  if (error || !data) {
    // Default to free plan if lookup fails
    return {
      planId: 'free',
      planName: 'Free',
      features: { invite_members: false, workspace_connections: false },
      stepsLimit: 1000,
      aiCreditsLimit: 100,
      maxTeamMembers: 1,
    }
  }

  // `plans` comes back as a single object due to the FK relationship
  const plan = data.plans as unknown as {
    id: string
    name: string
    features: Record<string, boolean>
    steps_limit: number
    ai_credits_limit: number
    max_team_members: number
  }

  return {
    planId: (plan?.id ?? 'free') as PlanId,
    planName: plan?.name ?? 'Free',
    features: (plan?.features ?? {}) as Record<string, boolean>,
    stepsLimit: plan?.steps_limit ?? 1000,
    aiCreditsLimit: plan?.ai_credits_limit ?? 100,
    maxTeamMembers: plan?.max_team_members ?? 1,
  }
}

export function hasFeature(plan: TeamPlan, feature: string): boolean {
  return plan.features[feature] === true
}

export function canInviteMembers(plan: TeamPlan, currentMemberCount: number): boolean {
  return hasFeature(plan, 'invite_members') && currentMemberCount < plan.maxTeamMembers
}
