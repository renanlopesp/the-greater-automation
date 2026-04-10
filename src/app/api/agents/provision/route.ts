import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { provisionAgent } from '@/lib/ai/agent-provisioning'
import { safeError } from '@/lib/safe-error'

/**
 * POST /api/agents/provision — Provision a Managed Agent + Environment for a team.
 *
 * Delegates to the shared provisionAgent() function.
 * Idempotent: if the team already has an agent_id + env_id, returns them directly.
 */
export async function POST() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!membership) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  try {
    const result = await provisionAgent(membership.team_id, user.id)
    return NextResponse.json(result, { status: result.created ? 201 : 200 })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('provision-agent', error, 'Failed to provision agent') },
      { status: 500 }
    )
  }
}
