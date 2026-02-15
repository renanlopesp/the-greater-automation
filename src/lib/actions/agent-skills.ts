'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

type ActionResult = { error?: string }

export async function createSkill(
  agentId: string,
  name: string,
  content: string,
  description?: string
): Promise<ActionResult & { id?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

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
    return { error: error.message }
  }

  revalidatePath(`/agents/${agentId}`)
  return { id: data.id }
}

export async function updateSkill(
  skillId: string,
  agentId: string,
  updates: { name?: string; description?: string; content?: string; is_enabled?: boolean }
): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

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

  if (error) return { error: error.message }

  revalidatePath(`/agents/${agentId}`)
  return {}
}

export async function deleteSkill(skillId: string, agentId: string): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('agent_skills')
    .delete()
    .eq('id', skillId)
    .eq('agent_id', agentId)

  if (error) return { error: error.message }

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
