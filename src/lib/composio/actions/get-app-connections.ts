'use server'

import { createServerClient } from '@/lib/supabase/server'

export interface AppConnection {
  id: string
  app_id: string
  account_label: string | null
  created_at: string
  composio_connection_id: string | null
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
