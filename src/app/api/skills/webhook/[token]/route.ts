import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { executeSkill } from '@/lib/skills/skill-executor'
import type { AgentSkillRow } from '@/lib/skills/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Use service role since webhooks are unauthenticated
  const supabase = createServiceClient()

  // Look up skill by webhook token in trigger_config
  const { data: skill } = await supabase
    .from('agent_skills')
    .select('*, agents(created_by)')
    .eq('is_enabled', true)
    .eq('source', 'rule')
    .filter('trigger_config->>webhook_token', 'eq', token)
    .single()

  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  // Parse request body as trigger data
  let triggerData: Record<string, unknown> = {}
  try {
    triggerData = await request.json()
  } catch {
    // If not JSON, use raw text
    triggerData = { body: await request.text() }
  }

  // Add metadata to trigger data
  triggerData._webhook = {
    token,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString(),
  }

  // Get the agent to find the creator
  const agent = skill.agents as { created_by: string } | null
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  try {
    const run = await executeSkill({
      skill: skill as unknown as AgentSkillRow,
      triggerData,
      userId: agent.created_by,
      supabaseClient: supabase,
    })
    return NextResponse.json({ success: true, run_id: run.id, status: run.status })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 }
    )
  }
}

// Also handle GET for webhook verification
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  return NextResponse.json({ status: 'active', token })
}
