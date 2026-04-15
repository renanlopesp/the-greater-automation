/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { fetchTeamMembers, fetchTeamInvitations } from '@/lib/queries/members'

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return NextResponse.json({ error: 'No team' }, { status: 400 })
  }

  // Determine current user role
  const { data: memberRow } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  const now = new Date().toISOString()

  // Fetch everything in parallel. The legacy `subscriptions` table was
  // dropped during the 2026-04-01 project move — Stripe/billing data is no
  // longer tracked here, so hasStripeSubscription/cancelAtPeriodEnd default
  // to false below.
  const [usageResult, teamResult, membersData, invitationsData, storeResult] = await Promise.all([
    supabase
      .from('usage')
      .select('steps_used, steps_limit, ai_credits_used, ai_credits_limit')
      .eq('team_id', teamId)
      .lte('period_start', now)
      .gte('period_end', now)
      .order('period_start', { ascending: false })
      .limit(1),
    supabase
      .from('teams')
      .select('id, plan_id, plans(id, name, features, max_team_members)')
      .eq('id', teamId)
      .single(),
    fetchTeamMembers(supabase, teamId),
    fetchTeamInvitations(supabase, teamId),
    supabase
      .from('stores')
      .select('id, name, segment, platform, platform_store_id, last_sync_at, settings')
      .eq('team_id', teamId)
      .single(),
  ])

  // Build usage
  const usageRow = usageResult.data?.[0]
  const usage = usageRow
    ? {
        stepsUsed: usageRow.steps_used,
        stepsLimit: usageRow.steps_limit,
        aiCreditsUsed: usageRow.ai_credits_used,
        aiCreditsLimit: usageRow.ai_credits_limit,
      }
    : null

  // Build plan data
  const teamWithPlan = teamResult.data as any
  const planInfo = teamWithPlan?.plans
  const planData = teamWithPlan
    ? {
        planId: planInfo?.id ?? teamWithPlan.plan_id ?? 'free',
        planName: planInfo?.name ?? 'Free',
        features: planInfo?.features ?? {},
        maxTeamMembers: planInfo?.max_team_members ?? 1,
        hasStripeSubscription: false,
        cancelAtPeriodEnd: false,
      }
    : null

  // Build store data
  const storeRow = storeResult.data
  let storeData = null
  if (storeRow) {
    const platformStoreId = storeRow.platform_store_id ?? null
    // The legacy backfill path (read composio_connection_id from
    // app_connections and reflect it on stores.platform_store_id) was
    // removed in the 2026-04-15 schema refactor — app_connections.app_id
    // and composio_connection_id are no longer columns; connection ids now
    // live inside app_connections.credentials (jsonb).
    storeData = {
      id: storeRow.id,
      name: storeRow.name,
      segment: storeRow.segment,
      platform: storeRow.platform ?? null,
      platform_store_id: platformStoreId,
      last_sync_at: storeRow.last_sync_at ?? null,
      settings: (storeRow.settings ?? null) as Record<string, unknown> | null,
    }
  }

  return NextResponse.json({
    usage,
    planData,
    members: membersData,
    invitations: invitationsData,
    currentUserRole: memberRow?.role ?? 'member',
    storeData,
  })
}
