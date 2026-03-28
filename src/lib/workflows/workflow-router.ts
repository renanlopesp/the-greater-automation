import { createServerClient } from '@/lib/supabase/server'
import type { AgentWorkflowRow, WorkflowTriggerType } from './types'

/**
 * Find all enabled workflows for an agent matching a trigger type.
 */
export async function findMatchingWorkflows(
  triggerType: WorkflowTriggerType,
  agentId: string
): Promise<AgentWorkflowRow[]> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('agent_workflows')
    .select(
      'id, name, description, agent_id, source, actions, trigger_config, conditions, action_template, workflow_id, is_enabled, execution_mode, run_count, last_run_at, created_at, updated_at'
    )
    .eq('agent_id', agentId)
    .eq('is_enabled', true)
    .eq('source', 'rule')
    .not('trigger_config', 'is', null)

  if (!data) return []

  return data.filter((workflow) => {
    const config = workflow.trigger_config as { type?: string } | null
    return config?.type === triggerType
  }) as unknown as AgentWorkflowRow[]
}

/**
 * Find a workflow by webhook token.
 */
export async function findWorkflowByWebhookToken(token: string): Promise<AgentWorkflowRow | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('agent_workflows')
    .select(
      'id, name, description, agent_id, source, actions, trigger_config, conditions, action_template, workflow_id, is_enabled, execution_mode, run_count, last_run_at, created_at, updated_at'
    )
    .eq('is_enabled', true)
    .not('trigger_config', 'is', null)

  if (!data) return null

  const workflow = data.find((w) => {
    const config = w.trigger_config as { type?: string; webhook_token?: string } | null
    return config?.type === 'webhook' && config.webhook_token === token
  })

  return workflow ? (workflow as unknown as AgentWorkflowRow) : null
}
