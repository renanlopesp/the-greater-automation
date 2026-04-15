import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { safeDbError } from '@/lib/safe-error'

const NotificationPatchSchema = z.object({
  is_read: z.boolean(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawBody = await request.json().catch(() => null)
  if (!rawBody) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = NotificationPatchSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: Object.keys(parsed.error.flatten().fieldErrors) },
      { status: 400 }
    )
  }
  const { is_read } = parsed.data

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: is_read })
    .eq('id', id)
    .eq('team_id', teamId)
    .select('id, read, created_at')
    .single()

  if (error)
    return NextResponse.json(
      { error: safeDbError('notifications', error, 'Failed to update notification') },
      { status: 500 }
    )

  return NextResponse.json(data)
}
