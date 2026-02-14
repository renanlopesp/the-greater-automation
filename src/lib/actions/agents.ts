'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

type ActionResult<T = void> = T extends void ? { error?: string } : { error?: string } & T

// ---------------------------------------------------------------------------
// Helper: update new agent columns via RPC (bypasses PostgREST schema cache)
// ---------------------------------------------------------------------------

async function updateAgentConfig(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  agentId: string,
  config: {
    systemPrompt?: string | null
    model?: string | null
    temperature?: number | null
    maxTokens?: number | null
    conversationStarters?: string[]
  }
) {
  const params: Record<string, unknown> = { p_agent_id: agentId }

  if (config.systemPrompt !== undefined) params.p_system_prompt = config.systemPrompt
  if (config.model !== undefined) params.p_model = config.model
  if (config.temperature !== undefined) params.p_temperature = config.temperature
  if (config.maxTokens !== undefined) params.p_max_tokens = config.maxTokens
  if (config.conversationStarters !== undefined) {
    params.p_conversation_starters = config.conversationStarters.filter(Boolean) as unknown as Json
  }

  // Only call RPC if there are config fields to update
  if (Object.keys(params).length > 1) {
    await supabase.rpc('update_agent_config' as never, params as never)
  }
}

// ---------------------------------------------------------------------------
// 1. createAgent
// ---------------------------------------------------------------------------

export async function createAgent(data: {
  teamId: string
  userId: string
  name: string
  description?: string
  palette?: string
  systemPrompt?: string
  model?: string
  temperature?: number
  maxTokens?: number
  conversationStarters?: string[]
  skillWorkflowIds?: string[]
}): Promise<ActionResult<{ id: string }>> {
  const trimmedName = data.name.trim()
  if (!trimmedName) {
    return { error: 'Agent name is required', id: '' }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', id: '' }

  // Insert with only original columns (PostgREST schema cache safe)
  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      team_id: data.teamId,
      created_by: data.userId,
      name: trimmedName,
      description: data.description?.trim() || null,
      palette: data.palette ?? 'blue',
    })
    .select('id')
    .single()

  if (error || !agent) {
    return { error: error?.message ?? 'Failed to create agent', id: '' }
  }

  // Update new columns via RPC to bypass PostgREST schema cache
  await updateAgentConfig(supabase, agent.id, {
    systemPrompt: data.systemPrompt?.trim() || null,
    model: data.model || null,
    temperature: data.temperature ?? null,
    maxTokens: data.maxTokens ?? null,
    conversationStarters: data.conversationStarters,
  })

  // Insert agent_skills for each selected workflow
  if (data.skillWorkflowIds && data.skillWorkflowIds.length > 0) {
    // Fetch workflow names to use as skill names
    const { data: workflows } = await supabase
      .from('workflows')
      .select('id, name')
      .in('id', data.skillWorkflowIds)

    if (workflows && workflows.length > 0) {
      const skills = workflows.map((w) => ({
        agent_id: agent.id,
        workflow_id: w.id,
        name: w.name,
      }))

      const { error: skillsError } = await supabase.from('agent_skills').insert(skills)

      if (skillsError) {
        // Clean up the agent if skills fail
        await supabase.from('agents').delete().eq('id', agent.id)
        return { error: 'Failed to add agent skills', id: '' }
      }
    }
  }

  revalidatePath('/workspace')
  revalidatePath('/dashboard')
  return { id: agent.id }
}

// ---------------------------------------------------------------------------
// 2. updateAgent
// ---------------------------------------------------------------------------

export async function updateAgent(
  agentId: string,
  data: {
    name?: string
    description?: string
    palette?: string
    systemPrompt?: string
    model?: string
    temperature?: number
    maxTokens?: number
    conversationStarters?: string[]
    skillWorkflowIds?: string[]
  }
): Promise<ActionResult> {
  if (data.name !== undefined && !data.name.trim()) {
    return { error: 'Agent name cannot be empty' }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Build update payload — only original columns (PostgREST schema cache safe)
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.name !== undefined) updatePayload.name = data.name.trim()
  if (data.description !== undefined) updatePayload.description = data.description.trim() || null
  if (data.palette !== undefined) updatePayload.palette = data.palette

  const { error } = await supabase.from('agents').update(updatePayload).eq('id', agentId)

  if (error) {
    return { error: error.message ?? 'Failed to update agent' }
  }

  // Update new columns via RPC to bypass PostgREST schema cache
  await updateAgentConfig(supabase, agentId, {
    ...(data.systemPrompt !== undefined && { systemPrompt: data.systemPrompt.trim() || null }),
    ...(data.model !== undefined && { model: data.model || null }),
    ...(data.temperature !== undefined && { temperature: data.temperature }),
    ...(data.maxTokens !== undefined && { maxTokens: data.maxTokens }),
    ...(data.conversationStarters !== undefined && {
      conversationStarters: data.conversationStarters,
    }),
  })

  // Update skills if provided
  if (data.skillWorkflowIds !== undefined) {
    // Delete existing skills
    await supabase.from('agent_skills').delete().eq('agent_id', agentId)

    // Insert new skills
    if (data.skillWorkflowIds.length > 0) {
      const { data: workflows } = await supabase
        .from('workflows')
        .select('id, name')
        .in('id', data.skillWorkflowIds)

      if (workflows && workflows.length > 0) {
        const skills = workflows.map((w) => ({
          agent_id: agentId,
          workflow_id: w.id,
          name: w.name,
        }))

        const { error: skillsError } = await supabase.from('agent_skills').insert(skills)

        if (skillsError) {
          return { error: 'Failed to update agent skills' }
        }
      }
    }
  }

  revalidatePath('/workspace')
  revalidatePath('/dashboard')
  revalidatePath(`/agents/${agentId}`)
  return {}
}
