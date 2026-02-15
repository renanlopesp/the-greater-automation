import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import {
  fetchTeam,
  fetchAgentsWithSkills,
  fetchWorkflows,
  fetchRunsToday,
} from '@/lib/queries/dashboard'
import DashboardClient from '@/components/dashboard/dashboard-client'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { connected, error: connectionError } = await searchParams

  // Get user's team (fast — needed for routing)
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

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="bg-muted h-10 w-48 animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="bg-muted h-[308px] animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="bg-muted h-64 animate-pulse rounded-2xl" />
        </div>
      }
    >
      <DashboardData teamId={teamId} connectedApp={connected} connectionError={connectionError} />
    </Suspense>
  )
}

/** Async Server Component — heavy data queries streamed via Suspense */
async function DashboardData({
  teamId,
  connectedApp,
  connectionError,
}: {
  teamId: string
  connectedApp?: string
  connectionError?: string
}) {
  const supabase = await createServerClient()

  const [team, agents, workflows, runsToday] = await Promise.all([
    fetchTeam(supabase, teamId),
    fetchAgentsWithSkills(supabase, teamId),
    fetchWorkflows(supabase, teamId, 'recently-edited'),
    fetchRunsToday(supabase, teamId),
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
          is_active: a.is_active,
        },
        skills: a.skills.map((s) => ({
          id: s.id,
          name: s.name,
        })),
      }))}
      initialWorkflows={workflows}
      runsToday={runsToday}
      teamId={teamId}
      connectedApp={connectedApp}
      connectionError={connectionError}
    />
  )
}
