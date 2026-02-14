import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { executeSkill } from '@/lib/skills/skill-executor'
import type { AgentSkillRow } from '@/lib/skills/types'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: skillId } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load skill
  const { data: skill } = await supabase.from('agent_skills').select('*').eq('id', skillId).single()
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

  // Parse optional trigger data from body
  let triggerData: Record<string, unknown> = {}
  try {
    const body = await request.json()
    triggerData = body.trigger_data || {}
  } catch {
    /* no body */
  }

  triggerData._manual = { executed_by: user.id, timestamp: new Date().toISOString() }

  try {
    const run = await executeSkill({
      skill: skill as unknown as AgentSkillRow,
      triggerData,
      userId: user.id,
    })

    return NextResponse.json({ success: true, run })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 }
    )
  }
}
