'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getUserTeamRole, canMutate } from '@/lib/auth/require-role'
import { safeDbError } from '@/lib/safe-error'

type ActionResult = { error?: string }

export async function createSkill(
  agentId: string,
  name: string,
  content: string,
  description?: string
): Promise<ActionResult & { id?: string }> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to manage agent skills' }

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('agent_skills')
    .insert({
      agent_id: agentId,
      name,
      content,
      description: description ?? null,
      source: 'manual',
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505')
      return { error: 'A skill with this name already exists for this agent' }
    return { error: safeDbError('agent-skills/create', error, 'Failed to create skill') }
  }

  revalidatePath(`/agents/${agentId}`)
  return { id: data.id }
}

export async function updateSkill(
  skillId: string,
  agentId: string,
  updates: { name?: string; description?: string; content?: string; is_enabled?: boolean }
): Promise<ActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to manage agent skills' }

  const supabase = await createServerClient()

  // Fetch current version if content is being updated
  let versionIncrement = {}
  if (updates.content !== undefined) {
    const { data: currentSkill } = await supabase
      .from('agent_skills')
      .select('version')
      .eq('id', skillId)
      .eq('agent_id', agentId)
      .single()

    if (currentSkill) {
      versionIncrement = { version: (currentSkill.version || 1) + 1 }
    }
  }

  const { error } = await supabase
    .from('agent_skills')
    .update({ ...updates, ...versionIncrement, updated_at: new Date().toISOString() })
    .eq('id', skillId)
    .eq('agent_id', agentId)

  if (error) return { error: safeDbError('agent-skills/update', error, 'Failed to update skill') }

  revalidatePath(`/agents/${agentId}`)
  return {}
}

export async function deleteSkill(skillId: string, agentId: string): Promise<ActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role)) return { error: 'You do not have permission to manage agent skills' }

  const supabase = await createServerClient()

  const { error } = await supabase
    .from('agent_skills')
    .delete()
    .eq('id', skillId)
    .eq('agent_id', agentId)

  if (error) return { error: safeDbError('agent-skills/delete', error, 'Failed to delete skill') }

  revalidatePath(`/agents/${agentId}`)
  return {}
}

export async function toggleSkill(
  skillId: string,
  agentId: string,
  enabled: boolean
): Promise<ActionResult> {
  return updateSkill(skillId, agentId, { is_enabled: enabled })
}

export async function getAgentSkills(agentId: string) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('agent_skills')
    .select('id, name, description, content, source, is_enabled, type, parameters, version')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })

  return data ?? []
}
