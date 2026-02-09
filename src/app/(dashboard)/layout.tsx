import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  // Fetch user's first team membership
  const { data: memberRows } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)

  const firstMembership = memberRows?.[0]
  let team = null
  if (firstMembership) {
    const { data: teamData } = await supabase
      .from('teams')
      .select('id, name, slug')
      .eq('id', firstMembership.team_id)
      .single()

    if (teamData) {
      team = { id: teamData.id, name: teamData.name, slug: teamData.slug }
    }
  }

  // Fetch current usage
  let usage = null
  if (team) {
    const now = new Date().toISOString()
    const { data: usageRows } = await supabase
      .from('usage')
      .select('steps_used, steps_limit, ai_credits_used, ai_credits_limit')
      .eq('team_id', team.id)
      .lte('period_start', now)
      .gte('period_end', now)
      .order('period_start', { ascending: false })
      .limit(1)

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

  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get('sidebar_state')?.value === 'true'

  return (
    <DashboardShell user={userData} team={team} usage={usage} defaultSidebarOpen={sidebarOpen}>
      {children}
    </DashboardShell>
  )
}
