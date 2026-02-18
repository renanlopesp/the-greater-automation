'use server'

import { createServerClient } from '@/lib/supabase/server'

export interface AppConnection {
  id: string
  app_id: string
  account_label: string | null
  created_at: string
  composio_connection_id: string | null
}

export interface WorkspaceConnection {
  appId: string
  accountLabel: string | null
  user: {
    fullName: string | null
    avatarUrl: string | null
  }
}

/**
 * Fetches the current user's app connections from Supabase.
 * Server-only — uses Supabase server client for auth context.
 */
export async function getAppConnections(): Promise<AppConnection[]> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return []

    const { data: connections } = await supabase
      .from('app_connections')
      .select('id, app_id, account_label, created_at, composio_connection_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return connections ?? []
  } catch (error) {
    console.error('Failed to fetch app connections:', error)
    return []
  }
}

/**
 * Fetches app connections for all team members except the current user.
 * Server-only — uses Supabase server client for auth context.
 * Never exposes composio_connection_id (security).
 */
export async function getWorkspaceConnections(teamId: string): Promise<WorkspaceConnection[]> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return []

    const { data: connections } = await supabase
      .from('app_connections')
      .select('app_id, account_label, profiles(full_name, avatar_url)')
      .eq('team_id', teamId)
      .neq('user_id', user.id)

    if (!connections) return []

    return connections.map((conn) => {
      const profile = Array.isArray(conn.profiles) ? conn.profiles[0] : conn.profiles
      return {
        appId: conn.app_id,
        accountLabel: conn.account_label,
        user: {
          fullName: profile?.full_name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
        },
      }
    })
  } catch (error) {
    console.error('Failed to fetch workspace connections:', error)
    return []
  }
}
