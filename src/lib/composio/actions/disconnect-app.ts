'use server'

import { getComposio } from '../client'
import { createServerClient } from '@/lib/supabase/server'

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
        console.warn('Failed to delete Composio connection:', error)
      }
    }

    // Delete from our DB
    const { error: deleteError } = await supabase
      .from('app_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('app_id', appId)

    if (deleteError) {
      console.error('Failed to delete connection:', deleteError)
      return { success: false, error: 'Failed to disconnect' }
    }

    return { success: true }
  } catch (error) {
    console.error('Disconnect error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect',
    }
  }
}
