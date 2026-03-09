import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { fetchAgentsWithSkills } from '@/lib/queries/dashboard'
import HomeClient from '@/components/home/home-client'
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
        <div className="mx-auto max-w-3xl space-y-10 px-6 pt-16 pb-8">
          <div className="space-y-2">
            <div className="bg-muted h-9 w-64 animate-pulse rounded-lg" />
            <div className="bg-muted h-4 w-40 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-[100px] animate-pulse rounded-xl" />
          <div className="bg-muted h-px" />
          <div className="space-y-3">
            <div className="bg-muted h-4 w-32 animate-pulse rounded" />
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="bg-muted h-24 animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <HomeData
        teamId={teamId}
        userId={user.id}
        connectedApp={connected}
        connectionError={connectionError}
      />
    </Suspense>
  )
}

async function HomeData({
  teamId,
  userId,
  connectedApp,
  connectionError,
}: {
  teamId: string
  userId: string
  connectedApp?: string
  connectionError?: string
}) {
  const supabase = await createServerClient()

  const [{ data: profile }, agents, { data: store }, { data: orchestrator }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).single(),
    fetchAgentsWithSkills(supabase, teamId),
    supabase.from('stores').select('name').eq('team_id', teamId).limit(1).single(),
    supabase
      .from('agents')
      .select('id')
      .eq('team_id', teamId)
      .eq('is_orchestrator', true)
      .limit(1)
      .single(),
  ])

  const specialistAgents = agents
    .filter((a) => !a.is_orchestrator)
    .map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      palette: a.palette,
      is_active: a.is_active ?? false,
    }))

  return (
    <HomeClient
      userName={profile?.full_name ?? null}
      storeName={store?.name ?? null}
      orchestratorId={orchestrator?.id ?? null}
      agents={specialistAgents}
      teamId={teamId}
      connectedApp={connectedApp}
      connectionError={connectionError}
    />
  )
}
