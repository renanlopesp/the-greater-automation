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
// Fetch agent skills (used by React Query on the client)
// ---------------------------------------------------------------------------

export async function getAgentSkills(agentId: string) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('agent_skills')
    .select(
      'id, name, description, source, last_run_at, workflow_id, action_template, trigger_config, conditions, actions, is_enabled, execution_mode, run_count, workflows(name, emoji)'
    )
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })

  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    source: s.source ?? null,
    last_run_at: s.last_run_at,
    workflow_id: s.workflow_id ?? undefined,
    workflow: s.workflow_id ? (s.workflows as { name: string; emoji: string } | null) : null,
    action_template: s.action_template as Record<string, unknown> | null,
    trigger_config: s.trigger_config as Record<string, unknown> | null,
    conditions: Array.isArray(s.conditions) ? s.conditions : undefined,
    actions: Array.isArray(s.actions) ? s.actions : undefined,
    is_enabled: s.is_enabled ?? undefined,
    execution_mode: s.execution_mode ?? undefined,
    run_count: s.run_count ?? undefined,
  }))
}

export type AgentSkillData = Awaited<ReturnType<typeof getAgentSkills>>[number]

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

  revalidatePath('/workspace')
  revalidatePath('/dashboard')
  revalidatePath(`/agents/${agentId}`)
  return {}
}
