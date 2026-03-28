import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[brand-dna API] No user session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: memberRows } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (!memberRows?.length) return NextResponse.json({ error: 'No team' }, { status: 400 })

  const cookieStore = await cookies()
  const selectedTeamId = cookieStore.get('selected_team_id')?.value
  let teamId = memberRows[0].team_id
  if (selectedTeamId && memberRows.some((m) => m.team_id === selectedTeamId)) {
    teamId = selectedTeamId
  }

  const serviceClient = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (serviceClient as any)
    .from('brand_dna')
    .select(
      'id, team_id, niche, tone, audience, positioning, words_to_use, words_to_avoid, average_ticket, brand_name, visual_identity, content_pillars, competitors, strengths, weaknesses, opportunities, fonts, texts, created_at, updated_at'
    )
    .eq('team_id', teamId)
    .single()

  if (error || !data) {
    console.error('[brand-dna API] Not found for team:', teamId, 'error:', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(data)
}
