'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

type ActionResult = { error?: string }

export async function createKnowledgeSkill(
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
    .from('agent_knowledge_skills')
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

export async function updateKnowledgeSkill(
  skillId: string,
  agentId: string,
  updates: { name?: string; description?: string; content?: string; is_enabled?: boolean }
): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('agent_knowledge_skills')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', skillId)
    .eq('agent_id', agentId)

  if (error) return { error: error.message }

  revalidatePath(`/agents/${agentId}`)
  return {}
}

export async function deleteKnowledgeSkill(
  skillId: string,
  agentId: string
): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('agent_knowledge_skills')
    .delete()
    .eq('id', skillId)
    .eq('agent_id', agentId)

  if (error) return { error: error.message }

  revalidatePath(`/agents/${agentId}`)
  return {}
}

export async function toggleKnowledgeSkill(
  skillId: string,
  agentId: string,
  enabled: boolean
): Promise<ActionResult> {
  return updateKnowledgeSkill(skillId, agentId, { is_enabled: enabled })
}
