import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import DashboardShellNew from '@/components/dashboard-shell-new'
import { TooltipProvider } from '@/components/ui/tooltip'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()

  // Round 1: auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Round 2: profile + team memberships + cookies (parallel)
  const [{ data: profile }, { data: memberRows }, cookieStore] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, avatar_url').eq('id', user.id).single(),
    supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    cookies(),
  ])

  if (!memberRows || memberRows.length === 0) {
    redirect('/onboarding')
  }

  // Determine active team from cookie or fallback to first membership
  const selectedTeamId = cookieStore.get('selected_team_id')?.value
  let activeTeamId = memberRows[0]?.team_id
  if (selectedTeamId && memberRows.some((m) => m.team_id === selectedTeamId)) {
    activeTeamId = selectedTeamId
  }

  // Round 3: onboarding check + team names (parallel)
  const teamIds = memberRows.map((m) => m.team_id)
  const [{ data: storeCheck }, { data: teamsData }] = await Promise.all([
    supabase.from('stores').select('onboarding_completed').eq('team_id', activeTeamId).single(),
    supabase.from('teams').select('id, name, slug').in('id', teamIds),
  ])

  if (!storeCheck || storeCheck.onboarding_completed === false) {
    redirect('/onboarding')
  }

  // Build minimal data for the shell
  const userTeams = (teamsData ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    role: memberRows.find((m) => m.team_id === t.id)?.role ?? 'member',
  }))

  const activeTeam = teamsData?.find((t) => t.id === activeTeamId)
  const team = activeTeam
    ? { id: activeTeam.id, name: activeTeam.name, slug: activeTeam.slug }
    : null

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

  return (
    <TooltipProvider>
      <DashboardShellNew
        user={userData}
        team={team}
        userTeams={userTeams}
        initialLanguage={cookieStore.get('lang')?.value}
      >
        {children}
      </DashboardShellNew>
    </TooltipProvider>
  )
}
