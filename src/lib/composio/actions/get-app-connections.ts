'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getComposio } from '@/lib/composio/client'

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
 * Fetches the current user's app connections.
 * 1. Check our DB (app_connections table)
 * 2. If empty, query Composio directly for the user's active connected accounts
 * 3. If still empty, query Composio for ALL project connected accounts (team sharing)
 */
export async function getAppConnections(): Promise<AppConnection[]> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return []

    // 1. Try DB records first
    const { data: dbConnections } = await supabase
      .from('app_connections')
      .select('id, app_id, account_label, created_at, composio_connection_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (dbConnections && dbConnections.length > 0) return dbConnections

    // 2. Fallback: query Composio for the user's own connected accounts
    const composio = getComposio()
    const { items: userAccounts } = await composio.connectedAccounts.list({
      userIds: [user.id],
    })
    const activeUserAccounts = (userAccounts ?? []).filter(
      (acc: { status: string }) => acc.status === 'ACTIVE'
    )

    if (activeUserAccounts.length > 0) {
      return activeUserAccounts.map(
        (acc: { id: string; toolkit?: { slug?: string }; createdAt?: string }) => ({
          id: acc.id,
          app_id: acc.toolkit?.slug ?? 'unknown',
          account_label: null,
          created_at: acc.createdAt ?? new Date().toISOString(),
          composio_connection_id: acc.id,
        })
      )
    }

    // 3. Fallback: query ALL project connected accounts (shared team connections)
    const { items: allAccounts } = await composio.connectedAccounts.list({})
    const activeAll = (allAccounts ?? []).filter(
      (acc: { status: string }) => acc.status === 'ACTIVE'
    )

    // Deduplicate by app_id (one entry per app)
    const seen = new Set<string>()
    return activeAll
      .map((acc: { id: string; toolkit?: { slug?: string }; createdAt?: string }) => ({
        id: acc.id,
        app_id: acc.toolkit?.slug ?? 'unknown',
        account_label: null,
        created_at: acc.createdAt ?? new Date().toISOString(),
        composio_connection_id: acc.id,
      }))
      .filter((c: AppConnection) => {
        if (seen.has(c.app_id)) return false
        seen.add(c.app_id)
        return true
      })
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
