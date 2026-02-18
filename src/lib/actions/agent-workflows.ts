'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import { getUserTeamRole, canMutate } from '@/lib/auth/require-role'

type ActionResult = { error?: string }

// ---------------------------------------------------------------------------
// Fetch agent workflows (used by React Query on the client)
// ---------------------------------------------------------------------------

export async function getAgentWorkflows(agentId: string) {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('agent_workflows')
    .select(
      'id, name, description, source, last_run_at, workflow_id, action_template, trigger_config, conditions, actions, is_enabled, execution_mode, run_count, workflows(name, emoji)'
    )
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })

  return (data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description ?? null,
    source: w.source ?? null,
    last_run_at: w.last_run_at,
    workflow_id: w.workflow_id ?? undefined,
    workflow: w.workflow_id ? (w.workflows as { name: string; emoji: string } | null) : null,
    action_template: w.action_template as Record<string, unknown> | null,
    trigger_config: w.trigger_config as Record<string, unknown> | null,
    conditions: Array.isArray(w.conditions) ? w.conditions : undefined,
    actions: Array.isArray(w.actions) ? w.actions : undefined,
    is_enabled: w.is_enabled ?? undefined,
    execution_mode: w.execution_mode ?? undefined,
    run_count: w.run_count ?? undefined,
  }))
}

export type AgentWorkflowData = Awaited<ReturnType<typeof getAgentWorkflows>>[number]

export interface SaveWorkflowInput {
  agentId: string
  name: string
  description?: string
  toolExecutions: Array<{
    action: string
    appId: string
    inputs: Record<string, unknown>
  }>
}

export async function addWorkflow(agentId: string, workflowId: string): Promise<ActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to manage agent workflows' }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get workflow name for the workflow name
  const { data: workflow } = await supabase
    .from('workflows')
    .select('name')
    .eq('id', workflowId)
    .single()

  if (!workflow) return { error: 'Workflow not found' }

  const { error } = await supabase.from('agent_workflows').insert({
    agent_id: agentId,
    workflow_id: workflowId,
    name: workflow.name,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Workflow already linked' }
    return { error: error.message }
  }

  revalidatePath(`/agents/${agentId}`)
  return {}
}

export async function removeWorkflow(workflowId: string, agentId: string): Promise<ActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to manage agent workflows' }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('agent_workflows').delete().eq('id', workflowId)

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

export async function saveWorkflowFromExecution(input: SaveWorkflowInput): Promise<ActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to manage agent workflows' }

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

  // Insert into agent_workflows
  const { error } = await supabase.from('agent_workflows').insert({
    agent_id: input.agentId,
    name: input.name,
    description: input.description,
    source: 'dynamic',
    action_template: actionTemplate,
    workflow_id: null,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Workflow name already exists' }
    return { error: error.message }
  }

  revalidatePath(`/agents/${input.agentId}`)
  return {}
}

export async function deleteWorkflow(workflowId: string, agentId: string): Promise<ActionResult> {
  const info = await getUserTeamRole()
  if (!info) return { error: 'Not authenticated' }
  if (!canMutate(info.role))
    return { error: 'You do not have permission to delete agent workflows' }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('agent_workflows').delete().eq('id', workflowId)

  if (error) return { error: error.message }

  revalidatePath(`/agents/${agentId}`)
  return {}
}
