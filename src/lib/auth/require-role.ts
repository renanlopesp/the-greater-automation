import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'

export type TeamRole = 'owner' | 'admin' | 'member'

export interface UserTeamInfo {
  userId: string
  teamId: string
  role: TeamRole
}

/**
 * Get the authenticated user's team ID and role for the active workspace.
 * Returns null if user is not authenticated or has no team membership.
 */
export const getUserTeamRole = cache(
  async function getUserTeamRole(): Promise<UserTeamInfo | null> {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const teamId = await getActiveTeamId(supabase, user.id)
    if (!teamId) return null

    const { data: memberRow } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .single()

    if (!memberRow) return null

    return { userId: user.id, teamId, role: memberRow.role as TeamRole }
  }
)

/**
 * Check if a role can perform write operations (create, edit, delete).
 * Only owner and admin can mutate resources.
 */
export function canMutate(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin'
}
