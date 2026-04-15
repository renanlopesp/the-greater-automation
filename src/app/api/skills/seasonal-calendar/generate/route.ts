import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { getSkillId } from '@/lib/actions/seasonal-calendar'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/skills/seasonal-calendar/generate')

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return NextResponse.json({ error: 'No team found' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { dateId, dateName, taskId } = body as {
    dateId?: string
    dateName?: string
    taskId?: string
  }
  if (!dateId || !dateName) {
    return NextResponse.json({ error: 'dateId and dateName are required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceClient = createServiceRoleClient() as any

  const skillId = await getSkillId(teamId)

  // Pre-create execution row so UI can poll status
  const { data: execRow } = await serviceClient
    .from('skill_executions')
    .insert({
      skill_id: skillId,
      team_id: teamId,
      status: 'running',
      input: { type: 'campaign', dateId, dateName },
    })
    .select('id')
    .single()

  const executionId = (execRow as { id: string } | null)?.id

  // Fire-and-forget to Edge Function
  const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-seasonal-campaign`

  fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.MCP_AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      team_id: teamId,
      execution_id: executionId,
      date_id: dateId,
      date_name: dateName,
      task_id: taskId,
    }),
  }).catch((err) => {
    log.error({ err }, 'edge fn dispatch error')
  })

  return NextResponse.json({ ok: true, dateId, executionId })
}
