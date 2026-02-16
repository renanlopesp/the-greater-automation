import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { fetchRuns, fetchWorkflowList } from '@/lib/queries/runs'
import RunsClient from '@/components/runs/runs-client'

export default async function RunsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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
        <div className="mx-auto flex max-w-7xl flex-col gap-4 p-6">
          {/* Title */}
          <div className="bg-muted h-8 w-24 animate-pulse rounded-lg" />
          {/* Filters */}
          <div className="flex gap-2">
            <div className="bg-muted h-9 w-48 animate-pulse rounded-lg" />
            <div className="bg-muted h-9 w-24 animate-pulse rounded-lg" />
            <div className="bg-muted h-9 w-28 animate-pulse rounded-lg" />
          </div>
          {/* Table */}
          <div className="space-y-0">
            <div className="bg-muted/30 h-10 animate-pulse rounded-t-xl" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-muted/15 border-muted h-12 animate-pulse border-t" />
            ))}
          </div>
        </div>
      }
    >
      <RunsData teamId={teamId} />
    </Suspense>
  )
}

/** Async Server Component — runs + workflows streamed via Suspense */
async function RunsData({ teamId }: { teamId: string }) {
  const supabase = await createServerClient()

  const [initialRuns, workflows] = await Promise.all([
    fetchRuns(supabase, teamId),
    fetchWorkflowList(supabase, teamId),
  ])

  return <RunsClient initialRuns={initialRuns} teamId={teamId} workflows={workflows} />
}
