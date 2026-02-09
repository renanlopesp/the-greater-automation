import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { fetchWorkspaceItems, fetchTeamMembers } from '@/lib/queries/workspace'
import WorkspaceClient from '@/components/workspace/workspace-client'

export default async function WorkspacePage() {
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

  const [items, teamMembers] = await Promise.all([
    fetchWorkspaceItems(supabase, teamId),
    fetchTeamMembers(supabase, teamId),
  ])

  return (
    <WorkspaceClient
      initialItems={items}
      teamId={teamId}
      teamMembers={teamMembers}
      userId={user.id}
    />
  )
}
