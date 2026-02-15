import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import {
  fetchWorkspaceItems,
  fetchTeamMembers,
  fetchFolders,
  buildFolderTree,
} from '@/lib/queries/workspace'
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

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="bg-muted h-10 w-40 animate-pulse rounded-lg" />
          <div className="bg-muted h-96 animate-pulse rounded-2xl" />
        </div>
      }
    >
      <WorkspaceData teamId={teamId} userId={user.id} />
    </Suspense>
  )
}

/** Async Server Component — workspace items streamed via Suspense */
async function WorkspaceData({ teamId, userId }: { teamId: string; userId: string }) {
  const supabase = await createServerClient()

  const [items, teamMembers, folders] = await Promise.all([
    fetchWorkspaceItems(supabase, teamId),
    fetchTeamMembers(supabase, teamId),
    fetchFolders(supabase, teamId),
  ])

  const folderTree = buildFolderTree(folders)

  return (
    <WorkspaceClient
      initialItems={items}
      teamId={teamId}
      teamMembers={teamMembers}
      userId={userId}
      folders={folders}
      folderTree={folderTree}
    />
  )
}
