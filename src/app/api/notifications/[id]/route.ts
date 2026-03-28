import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { safeDbError } from '@/lib/safe-error'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { is_read } = body as { is_read: boolean }

  // Get user's team_id to verify access
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: is_read })
    .eq('id', id)
    .eq('team_id', membership.team_id)
    .select('id, read, created_at')
    .single()

  if (error)
    return NextResponse.json(
      { error: safeDbError('notifications', error, 'Failed to update notification') },
      { status: 500 }
    )

  return NextResponse.json(data)
}
