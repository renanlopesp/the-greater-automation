import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { executeSkill } from '@/lib/skills/skill-executor'
import type { AgentSkillRow } from '@/lib/skills/types'

export async function POST(request: NextRequest) {
  // Verify cron secret (optional)
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Find all enabled scheduled skills
  const { data: skills } = await supabase
    .from('agent_skills')
    .select('*, agents(created_by)')
    .eq('is_enabled', true)
    .eq('source', 'rule')
    .filter('trigger_config->>type', 'eq', 'scheduled')

  if (!skills || skills.length === 0) {
    return NextResponse.json({ executed: 0 })
  }

  // Execute each skill
  const results = []
  for (const skill of skills) {
    const agent = skill.agents as { created_by: string } | null
    if (!agent) continue

    try {
      const run = await executeSkill({
        skill: skill as unknown as AgentSkillRow,
        triggerData: { _cron: { timestamp: new Date().toISOString() } },
        userId: agent.created_by,
        supabaseClient: supabase,
      })
      results.push({ skill_id: skill.id, run_id: run.id, status: run.status })
    } catch (error) {
      results.push({
        skill_id: skill.id,
        error: error instanceof Error ? error.message : 'Failed',
      })
    }
  }

  return NextResponse.json({ executed: results.length, results })
}
