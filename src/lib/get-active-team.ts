import { cache } from 'react'
import { cookies } from 'next/headers'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get the active team ID for the current user, respecting the workspace switcher cookie.
 * Falls back to the first team membership if no cookie is set or the cookie value is invalid.
 */
export const getActiveTeamId = cache(
  async (supabase: SupabaseClient, userId: string): Promise<string | null> => {
    const { data: memberRows } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (!memberRows || memberRows.length === 0) return null

    const cookieStore = await cookies()
    const selectedTeamId = cookieStore.get('selected_team_id')?.value

    // Use the cookie value if it matches a valid membership
    if (selectedTeamId && memberRows.some((m) => m.team_id === selectedTeamId)) {
      return selectedTeamId
    }

    // Fallback to first team
    return memberRows[0].team_id
  }
)
