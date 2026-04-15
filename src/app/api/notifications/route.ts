import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'

export async function GET() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const { data, error } = await supabase
    .from('notifications')
    .select('id, urgency, title, body, is_read, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error)
    return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })

  // Normalise urgency to the three buckets the orchestrator UI expects.
  const normaliseUrgency = (u: string | null): 'urgent' | 'opportunity' | 'insight' => {
    if (u === 'urgent') return 'urgent'
    if (u === 'opportunity') return 'opportunity'
    return 'insight'
  }

  const notifications = (data ?? []).map((n) => ({
    id: n.id,
    urgency: normaliseUrgency(n.urgency ?? null),
    title: n.title,
    body: n.body ?? null,
    cta_url: null,
    is_read: n.is_read ?? false,
    created_at: n.created_at,
    source_agent: null,
  }))

  return NextResponse.json(notifications)
}
