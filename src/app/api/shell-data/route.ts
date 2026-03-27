import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cookieStore = await cookies()

  // Fetch profile + team memberships in parallel
  const [{ data: profile }, { data: memberRows }] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, avatar_url').eq('id', user.id).single(),
    supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  if (!memberRows || memberRows.length === 0) {
    return NextResponse.json({ redirect: '/onboarding' })
  }

  // Determine active team
  const selectedTeamId = cookieStore.get('selected_team_id')?.value
  let activeTeamId = memberRows[0]?.team_id
  if (selectedTeamId && memberRows.some((m) => m.team_id === selectedTeamId)) {
    activeTeamId = selectedTeamId
  }

  // Fetch team names
  const teamIds = memberRows.map((m) => m.team_id)
  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, slug')
    .in('id', teamIds)

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

  return NextResponse.json({
    user: userData,
    team,
    userTeams,
    language: cookieStore.get('lang')?.value ?? null,
  })
}
