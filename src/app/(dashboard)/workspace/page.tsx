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
import { getActiveTeamId } from '@/lib/get-active-team'

export default async function WorkspacePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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
        <div className="mx-auto flex max-w-7xl flex-col gap-4 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="bg-muted h-8 w-32 animate-pulse rounded-lg" />
            <div className="flex gap-2">
              <div className="bg-muted h-9 w-28 animate-pulse rounded-lg" />
              <div className="bg-muted h-9 w-36 animate-pulse rounded-lg" />
            </div>
          </div>
          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <div className="bg-muted h-9 w-48 animate-pulse rounded-lg" />
              <div className="bg-muted h-9 w-24 animate-pulse rounded-lg" />
              <div className="bg-muted h-9 w-20 animate-pulse rounded-lg" />
              <div className="bg-muted h-9 w-20 animate-pulse rounded-lg" />
            </div>
            <div className="bg-muted h-9 w-24 animate-pulse rounded-lg" />
          </div>
          {/* Bulk action bar */}
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg border px-4 py-2.5">
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-border h-4 w-px" />
            <div className="bg-muted h-8 w-32 animate-pulse rounded-md" />
            <div className="bg-muted h-8 w-28 animate-pulse rounded-md" />
            <div className="bg-muted h-8 w-28 animate-pulse rounded-md" />
          </div>
          {/* Table rows */}
          <div className="space-y-0">
            <div className="bg-muted/30 h-10 animate-pulse rounded-t-xl" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-muted/15 border-muted h-14 animate-pulse border-t" />
            ))}
          </div>
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
