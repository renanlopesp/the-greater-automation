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

  const [initialRuns, workflows] = await Promise.all([
    fetchRuns(supabase, teamId),
    fetchWorkflowList(supabase, teamId),
  ])

  return <RunsClient initialRuns={initialRuns} teamId={teamId} workflows={workflows} />
}
