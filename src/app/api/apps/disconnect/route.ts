import { createServerClient } from '@/lib/supabase/server'
import { getComposio } from '@/lib/composio/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { app_id } = body as { app_id?: string }

    if (!app_id) {
      return NextResponse.json({ error: 'app_id is required' }, { status: 400 })
    }

    // Look up the local connection to get the Composio connection ID
    const { data: connection } = await supabase
      .from('app_connections')
      .select('composio_connection_id')
      .eq('user_id', user.id)
      .eq('app_id', app_id)
      .single()

    // Delete from Composio if we have a connection ID
    if (connection?.composio_connection_id) {
      try {
        const composio = getComposio()
        await composio.connectedAccounts.delete({
          connectedAccountId: connection.composio_connection_id,
        })
      } catch (error) {
        // Log but don't block local deletion if Composio delete fails
        console.warn('Failed to delete Composio connection:', error)
      }
    }

    // Delete from our DB
    const { error: deleteError } = await supabase
      .from('app_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('app_id', app_id)

    if (deleteError) {
      console.error('Failed to delete connection:', deleteError)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
