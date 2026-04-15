import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { getStoreConnection } from '@/lib/studio/ecommerce-connection'

/**
 * GET /api/studio/ecommerce — Returns the discriminator the studio chat needs
 * to enforce mutual exclusion between Nuvemshop (native) and Composio Shopify.
 *
 * The client fetches this once on mount and forwards the `kind` field inside
 * the `creativeState` payload sent to the `studio-chat` edge function so the
 * AI's system prompt + regex fallbacks know to never offer a Shopify
 * connection to a Nuvemshop-connected team (spec 069).
 */
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ kind: null }, { status: 401 })

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return NextResponse.json({ kind: null })

  const conn = await getStoreConnection(teamId, user.id)
  return NextResponse.json({ kind: conn.kind })
}
