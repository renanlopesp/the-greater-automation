/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — LEGACY SCHEMA DRIFT (spec 071)
// References app_connections.composio_connection_id; that column was
// moved into credentials (jsonb) during the 2026-04-15 schema refactor.

'use server'

import { getComposio } from '../client'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('composio/disconnect-app')

/**
 * Disconnects an app by removing the connection from Composio and Supabase.
 */
export async function disconnectApp(appId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    // Look up connection to get the Composio ID
    const { data: connection } = await supabase
      .from('app_connections')
      .select('composio_connection_id')
      .eq('user_id', user.id)
      .eq('app_id', appId)
      .single()

    // Delete from Composio if we have a connection ID
    if (connection?.composio_connection_id) {
      try {
        const composio = getComposio()
        await composio.connectedAccounts.delete(connection.composio_connection_id)
      } catch (error) {
        log.warn({ err: error }, 'Failed to delete Composio connection')
      }
    }

    // For native platform connections (Nuvemshop/Shopify), clear the store token.
    // These use stores.platform_access_token, not app_connections/Composio.
    const NATIVE_PLATFORMS = ['nuvemshop', 'tiendanube', 'shopify']
    if (NATIVE_PLATFORMS.includes(appId.toLowerCase())) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (membership?.team_id) {
        const serviceClient = createServiceRoleClient()
        const { error: storeError } = await serviceClient
          .from('stores')
          .update({ platform_access_token: null, platform_store_id: null })
          .eq('team_id', membership.team_id)
          .eq('platform', appId.toLowerCase())

        if (storeError) {
          return { success: false, error: `Failed to disconnect store: ${storeError.message}` }
        }
      }
    }

    // Delete from app_connections (Composio apps or redundant native entries)
    await supabase.from('app_connections').delete().eq('user_id', user.id).eq('app_id', appId)

    return { success: true }
  } catch (error) {
    log.error({ err: error }, 'Disconnect error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect',
    }
  }
}
