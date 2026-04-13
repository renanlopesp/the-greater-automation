import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { getSkillId } from '@/lib/actions/seasonal-calendar'

const VALID_SECTIONS = ['copies', 'email', 'assets', 'video', 'timeline'] as const
type SectionType = (typeof VALID_SECTIONS)[number]

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return NextResponse.json({ error: 'No team found' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { taskId, dateId, sectionType } = body as {
    taskId?: string
    dateId?: string
    sectionType?: string
  }
  if (!taskId || !dateId || !sectionType) {
    return NextResponse.json(
      { error: 'taskId, dateId and sectionType are required' },
      { status: 400 }
    )
  }
  if (!VALID_SECTIONS.includes(sectionType as SectionType)) {
    return NextResponse.json(
      { error: `invalid sectionType. Must be one of: ${VALID_SECTIONS.join(', ')}` },
      { status: 400 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceClient = createServiceRoleClient() as any
  const skillId = await getSkillId(teamId)

  const { data: execRow } = await serviceClient
    .from('skill_executions')
    .insert({
      skill_id: skillId,
      team_id: teamId,
      status: 'running',
      input: { type: 'deliverable', dateId, sectionType },
    })
    .select('id')
    .single()
  const executionId = (execRow as { id: string } | null)?.id

  const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-seasonal-deliverable?secret=${process.env.MCP_AUTH_TOKEN}`

  fetch(edgeFnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      team_id: teamId,
      task_id: taskId,
      date_id: dateId,
      section_type: sectionType,
      execution_id: executionId,
    }),
  }).catch((err) => {
    console.error('[generate-deliverable] edge fn dispatch error:', err)
  })

  return NextResponse.json({ ok: true, executionId, dateId, sectionType })
}
