import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { fetchTeam, fetchAgentsWithSkills, fetchWorkflows } from '@/lib/queries/dashboard'
import DashboardClient from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user's team
  const { data: memberRows } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)

  const teamId = memberRows?.[0]?.team_id
  if (!teamId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">No team found. Please contact support.</p>
      </div>
    )
  }

  const [team, agents, workflows] = await Promise.all([
    fetchTeam(supabase, teamId),
    fetchAgentsWithSkills(supabase, teamId),
    fetchWorkflows(supabase, teamId, 'recently-edited'),
  ])

  return (
    <DashboardClient
      team={{ name: team?.name ?? 'My Team', avatar_url: team?.avatar_url ?? null }}
      initialAgents={agents.map((a) => ({
        agent: {
          id: a.id,
          name: a.name,
          description: a.description,
          avatar_url: a.avatar_url,
          palette: a.palette,
        },
        skills: a.skills.map((s) => ({
          id: s.id,
          name: s.name,
        })),
      }))}
      initialWorkflows={workflows}
      teamId={teamId}
    />
  )
}
