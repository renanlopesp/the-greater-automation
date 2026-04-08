'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getComposio } from '@/lib/composio/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('composio/get-app-connections')

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

    // Check if user's team has a Nuvemshop store connected (native, not Composio)
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    let nuvemshopConnection: AppConnection | null = null
    if (teamMember) {
      const { data: store } = await supabase
        .from('stores')
        .select('id, platform, platform_access_token, created_at')
        .eq('team_id', teamMember.team_id)
        .eq('platform', 'nuvemshop')
        .limit(1)
        .maybeSingle()

      if (store?.platform_access_token) {
        nuvemshopConnection = {
          id: `nuvemshop_${store.id}`,
          app_id: 'nuvemshop',
          account_label: 'Nuvemshop',
          created_at: store.created_at ?? new Date().toISOString(),
          composio_connection_id: null,
        }
      }
    }

    const allConnections: AppConnection[] = [...(dbConnections ?? [])]

    // Append native Nuvemshop connection if not already present
    if (nuvemshopConnection && !allConnections.some((c) => c.app_id === 'nuvemshop')) {
      allConnections.push(nuvemshopConnection)
    }

    // 2. Always check Composio for active connections not yet in our DB
    try {
      const composio = getComposio()
      const { items: userAccounts } = await composio.connectedAccounts.list({
        userIds: [user.id],
      })
      const activeUserAccounts = (userAccounts ?? []).filter(
        (acc: { status: string }) => acc.status === 'ACTIVE'
      )

      const dbAppIds = new Set(allConnections.map((c) => c.app_id))
      for (const acc of activeUserAccounts as Array<{
        id: string
        toolkit?: { slug?: string }
        createdAt?: string
      }>) {
        const appId = acc.toolkit?.slug ?? 'unknown'
        if (!dbAppIds.has(appId)) {
          allConnections.push({
            id: acc.id,
            app_id: appId,
            account_label: null,
            created_at: acc.createdAt ?? new Date().toISOString(),
            composio_connection_id: acc.id,
          })
        }
      }
    } catch (composioError) {
      log.warn({ err: composioError }, 'Composio sync check failed, using DB only')
    }

    return allConnections
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch app connections')
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
    log.error({ err: error }, 'Failed to fetch workspace connections')
    return []
  }
}
