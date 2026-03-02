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
import { getActiveTeamId } from '@/lib/get-active-team'

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

  // Get user's active team (respects workspace switcher cookie)
  const teamId = await getActiveTeamId(supabase, user.id)
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
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pt-12 pb-12">
          {/* Page header */}
          <div className="flex flex-col gap-1">
            <div className="bg-muted h-8 w-40 animate-pulse rounded-lg" />
            <div className="bg-muted h-4 w-72 animate-pulse rounded" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="bg-card border-border flex items-center gap-3 rounded-xl border p-4"
              >
                <div className="bg-muted h-9 w-9 animate-pulse rounded-lg" />
                <div className="flex flex-col gap-1">
                  <div className="bg-muted h-7 w-8 animate-pulse rounded" />
                  <div className="bg-muted h-3 w-16 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Agents section */}
          <div className="flex flex-col gap-3">
            <div className="bg-muted h-6 w-20 animate-pulse rounded" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="bg-muted h-[308px] animate-pulse rounded-2xl" />
              ))}
            </div>
          </div>

          {/* Workflows section */}
          <div className="flex flex-col gap-3">
            <div className="bg-muted h-6 w-28 animate-pulse rounded" />
            <div className="bg-muted h-9 w-80 animate-pulse rounded-lg" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="bg-muted h-12 animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
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

  // Separate orchestrator from specialist agents
  const orchestrator = agents.find((a) => a.is_orchestrator)
  const specialistAgents = agents.filter((a) => !a.is_orchestrator)

  return (
    <DashboardClient
      team={{ name: team?.name ?? 'My Team', avatar_url: team?.avatar_url ?? null }}
      orchestrator={
        orchestrator
          ? {
              id: orchestrator.id,
              name: orchestrator.name,
              description: orchestrator.description,
              palette: orchestrator.palette,
            }
          : null
      }
      initialAgents={specialistAgents.map((a) => ({
        agent: {
          id: a.id,
          name: a.name,
          description: a.description,
          avatar_url: a.avatar_url,
          palette: a.palette,
          is_active: a.is_active,
        },
        workflows: a.skills.map((s) => ({
          id: s.id,
          name: s.name,
        })),
        skillCount: a.skillCount,
      }))}
      initialWorkflows={workflows}
      runsToday={runsToday}
      teamId={teamId}
      connectedApp={connectedApp}
      connectionError={connectionError}
    />
  )
}
