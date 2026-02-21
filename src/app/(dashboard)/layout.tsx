import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/dashboard-shell'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  fetchTeamMembers,
  fetchTeamInvitations,
  fetchPendingInvitationsForUser,
} from '@/lib/queries/members'
import type { PlanData } from '@/types/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile and all team memberships in parallel
  const [{ data: profile }, { data: memberRows }] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, avatar_url').eq('id', user.id).single(),
    supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  // Determine active team from cookie or fallback to first membership
  const cookieStore = await cookies()
  const selectedTeamId = cookieStore.get('selected_team_id')?.value

  let activeTeamId = memberRows?.[0]?.team_id
  if (selectedTeamId && memberRows?.some((m) => m.team_id === selectedTeamId)) {
    activeTeamId = selectedTeamId
  }

  // Fetch team details for all memberships (for the switcher)
  let userTeams: { id: string; name: string; role: string }[] = []
  if (memberRows && memberRows.length > 0) {
    const teamIds = memberRows.map((m) => m.team_id)
    const { data: teamsData } = await supabase.from('teams').select('id, name').in('id', teamIds)

    if (teamsData) {
      userTeams = teamsData.map((t) => ({
        id: t.id,
        name: t.name,
        role: memberRows.find((m) => m.team_id === t.id)?.role ?? 'member',
      }))
    }
  }

  // Fetch team and usage in parallel (both depend on activeTeamId)
  let team = null
  let usage = null
  let planData: PlanData | null = null
  if (activeTeamId) {
    const now = new Date().toISOString()
    const [{ data: teamData }, { data: usageRows }, { data: subscriptionRow }] = await Promise.all([
      supabase
        .from('teams')
        .select('id, name, slug, plan_id, has_store, plans(id, name, features, max_team_members)')
        .eq('id', activeTeamId)
        .single(),
      supabase
        .from('usage')
        .select('steps_used, steps_limit, ai_credits_used, ai_credits_limit')
        .eq('team_id', activeTeamId)
        .lte('period_start', now)
        .gte('period_end', now)
        .order('period_start', { ascending: false })
        .limit(1),
      supabase
        .from('subscriptions')
        .select('stripe_subscription_id, cancel_at_period_end, status')
        .eq('team_id', activeTeamId)
        .single(),
    ])

    if (teamData) {
      // Redirect to onboarding if team doesn't have a store yet
      if (!teamData.has_store) {
        redirect('/onboarding')
      }

      team = { id: teamData.id, name: teamData.name, slug: teamData.slug }

      const teamWithPlan = teamData as typeof teamData & {
        plans: {
          id: string
          name: string
          features: Record<string, boolean>
          max_team_members: number
        } | null
      }
      const planInfo = teamWithPlan.plans
      planData = {
        planId: (planInfo?.id ?? teamWithPlan.plan_id ?? 'free') as PlanData['planId'],
        planName: planInfo?.name ?? 'Free',
        features: (planInfo?.features ?? {}) as Record<string, boolean>,
        maxTeamMembers: planInfo?.max_team_members ?? 1,
        hasStripeSubscription: !!subscriptionRow?.stripe_subscription_id,
        cancelAtPeriodEnd: subscriptionRow?.cancel_at_period_end ?? false,
      }
    }

    const usageData = usageRows?.[0]
    if (usageData) {
      usage = {
        stepsUsed: usageData.steps_used,
        stepsLimit: usageData.steps_limit,
        aiCreditsUsed: usageData.ai_credits_used,
        aiCreditsLimit: usageData.ai_credits_limit,
      }
    }
  }

  // Fetch team members and invitations
  let members: Awaited<ReturnType<typeof fetchTeamMembers>> = []
  let invitations: Awaited<ReturnType<typeof fetchTeamInvitations>> = []
  let currentUserRole: 'owner' | 'admin' | 'member' = 'member'

  if (team) {
    const [fetchedMembers, fetchedInvitations] = await Promise.all([
      fetchTeamMembers(supabase, team.id),
      fetchTeamInvitations(supabase, team.id),
    ])
    members = fetchedMembers
    invitations = fetchedInvitations
    const currentMember = fetchedMembers.find((m) => m.id === user.id)
    if (currentMember) {
      currentUserRole = currentMember.role
    }
  }

  // Fetch pending invitations for the current user (invitations to join other teams)
  const userEmail = profile?.email ?? user.email ?? ''
  const pendingUserInvitations = userEmail
    ? await fetchPendingInvitationsForUser(supabase, userEmail)
    : []

  const userData = profile
    ? {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
      }
    : {
        id: user.id,
        email: user.email ?? '',
        fullName: null,
        avatarUrl: null,
      }

  const sidebarOpen = cookieStore.get('sidebar_state')?.value === 'true'

  return (
    <TooltipProvider>
      <DashboardShell
        user={userData}
        team={team}
        userTeams={userTeams}
        usage={usage}
        members={members}
        invitations={invitations}
        pendingUserInvitations={pendingUserInvitations}
        currentUserRole={currentUserRole}
        defaultSidebarOpen={sidebarOpen}
        planData={planData}
      >
        {children}
      </DashboardShell>
    </TooltipProvider>
  )
}
