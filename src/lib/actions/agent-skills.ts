'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

type ActionResult = { error?: string }

export interface SaveSkillInput {
  agentId: string
  name: string
  description?: string
  toolExecutions: Array<{
    action: string
    appId: string
    inputs: Record<string, unknown>
  }>
}

export async function addSkill(agentId: string, workflowId: string): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get workflow name for the skill name
  const { data: workflow } = await supabase
    .from('workflows')
    .select('name')
    .eq('id', workflowId)
    .single()

  if (!workflow) return { error: 'Workflow not found' }

  const { error } = await supabase.from('agent_skills').insert({
    agent_id: agentId,
    workflow_id: workflowId,
    name: workflow.name,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Skill already linked' }
    return { error: error.message }
  }

  revalidatePath(`/agents/${agentId}`)
  return {}
}

export async function removeSkill(skillId: string, agentId: string): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('agent_skills').delete().eq('id', skillId)

  if (error) return { error: error.message }

  revalidatePath(`/agents/${agentId}`)
  return {}
}

function detectPlaceholder(key: string, value: unknown): string {
  if (typeof value !== 'string') return String(value)

  // URL patterns
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return '{{url}}'
  }

  // Repo patterns (org/repo or just repo name)
  if (key.toLowerCase().includes('repo') && value.includes('/')) {
    return '{{repository}}'
  }

  // Issue/PR numbers
  if (
    (key.toLowerCase().includes('issue') || key.toLowerCase().includes('number')) &&
    /^\d+$/.test(value)
  ) {
    return '{{number}}'
  }

  // Channel names (slack-style)
  if (key.toLowerCase().includes('channel')) {
    return '{{channel}}'
  }

  // Keep text content as-is (likely templates user wants to preserve)
  return value
}

export async function saveSkillFromExecution(input: SaveSkillInput): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Build action_template from toolExecutions
  let actionTemplate: Json

  if (input.toolExecutions.length === 1) {
    // Single action
    const execution = input.toolExecutions[0]
    const inputSchema: Record<string, string> = {}

    // Convert inputs to schema with placeholder detection
    for (const [key, value] of Object.entries(execution.inputs)) {
      inputSchema[key] = detectPlaceholder(key, value)
    }

    actionTemplate = {
      type: 'single',
      action: execution.action,
      app_id: execution.appId,
      input_schema: inputSchema,
    } as Json
  } else {
    // Multi-step
    const steps = input.toolExecutions.map((execution) => {
      const inputSchema: Record<string, string> = {}

      for (const [key, value] of Object.entries(execution.inputs)) {
        inputSchema[key] = detectPlaceholder(key, value)
      }

      return {
        action: execution.action,
        app_id: execution.appId,
        input_schema: inputSchema,
      }
    })

    actionTemplate = {
      type: 'multi',
      steps,
    } as Json
  }

  // Insert into agent_skills
  const { error } = await supabase.from('agent_skills').insert({
    agent_id: input.agentId,
    name: input.name,
    description: input.description,
    source: 'dynamic',
    action_template: actionTemplate,
    workflow_id: null,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Skill name already exists' }
    return { error: error.message }
  }

  revalidatePath(`/agents/${input.agentId}`)
  return {}
}

export async function deleteSkill(skillId: string, agentId: string): Promise<ActionResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('agent_skills').delete().eq('id', skillId)

  if (error) return { error: error.message }

  revalidatePath(`/agents/${agentId}`)
  return {}
}
