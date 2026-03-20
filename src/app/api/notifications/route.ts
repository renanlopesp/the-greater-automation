import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's team_id
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, message, read, created_at')
    .eq('team_id', membership.team_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error)
    return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })

  // Map existing DB columns to the OrchestratorNotification shape
  const typeToUrgency = (type: string): 'urgent' | 'opportunity' | 'insight' => {
    if (type === 'workflow_run_failed') return 'urgent'
    if (type === 'workflow_run_completed') return 'opportunity'
    return 'insight'
  }

  const notifications = (data ?? []).map((n) => ({
    id: n.id,
    urgency: typeToUrgency(n.type ?? 'general'),
    title: n.title,
    body: n.message ?? null,
    cta_url: null,
    is_read: n.read ?? false,
    created_at: n.created_at,
    source_agent: null,
  }))

  return NextResponse.json(notifications)
}
