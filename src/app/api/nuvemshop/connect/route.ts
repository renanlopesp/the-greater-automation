import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appId = process.env.NUVEMSHOP_APP_ID
  if (!appId) return NextResponse.json({ error: 'Nuvemshop not configured' }, { status: 500 })

  // Prefer explicit team_id from query param (sent by the UI), fall back to first membership
  let teamId = request.nextUrl.searchParams.get('team_id')
  if (!teamId) {
    const { data: member } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
    if (!member) return NextResponse.json({ error: 'No team found' }, { status: 400 })
    teamId = member.team_id
  }

  // Verify user is actually a member of this team
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .eq('team_id', teamId)
    .single()
  if (!membership) return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })

  const redirectUri = request.nextUrl.searchParams.get('redirect_uri') || '/workspace'

  const state = Buffer.from(
    JSON.stringify({
      team_id: teamId,
      redirect_uri: redirectUri,
      ts: Date.now(),
    })
  ).toString('base64url')

  const authUrl = new URL(`https://www.nuvemshop.com.br/apps/${appId}/authorize`)
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
