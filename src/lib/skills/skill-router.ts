import { createServerClient } from '@/lib/supabase/server'
import type { AgentSkillRow, SkillTriggerType } from './types'

/**
 * Find all enabled skills for an agent matching a trigger type.
 */
export async function findMatchingSkills(
  triggerType: SkillTriggerType,
  agentId: string
): Promise<AgentSkillRow[]> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('agent_skills')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_enabled', true)
    .eq('source', 'rule')
    .not('trigger_config', 'is', null)

  if (!data) return []

  return data.filter((skill) => {
    const config = skill.trigger_config as { type?: string } | null
    return config?.type === triggerType
  }) as unknown as AgentSkillRow[]
}

/**
 * Find a skill by webhook token.
 */
export async function findSkillByWebhookToken(token: string): Promise<AgentSkillRow | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('agent_skills')
    .select('*')
    .eq('is_enabled', true)
    .not('trigger_config', 'is', null)

  if (!data) return null

  const skill = data.find((s) => {
    const config = s.trigger_config as { type?: string; webhook_token?: string } | null
    return config?.type === 'webhook' && config.webhook_token === token
  })

  return skill ? (skill as unknown as AgentSkillRow) : null
}
