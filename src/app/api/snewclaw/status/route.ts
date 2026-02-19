import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Convenience endpoint — returns the current user's snewclaw instance.
 * Used by the chat page which doesn't know the instance ID upfront.
 */
export async function GET() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: instance } = await supabase
    .from('snewclaw_instances')
    .select('id, status, fly_machine_id, region, config, last_activity_at, created_at')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'No instance found' }, { status: 404 })
  }

  return NextResponse.json(instance)
}
