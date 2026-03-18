'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAgentTypeDefinition } from './registry'

type InstallResult = { agentId: string } | { error: string }

/**
 * Provisions a new agent of the given type for the specified team.
 * Creates the agent row, all module rows, and all workflow rows in sequence.
 * Returns the new agentId or an error string.
 *
 * Uses service role client to bypass RLS during creation.
 */
export async function installAgent(
  agentType: string,
  teamId: string,
  userId: string
): Promise<InstallResult> {
  const definition = getAgentTypeDefinition(agentType)
  if (!definition) {
    return { error: `Unknown agent type: ${agentType}` }
  }

  const supabase = createServiceRoleClient()

  // Prevent duplicate installs: check if this agent_type already exists for this team.
  // We query via RPC raw SQL to avoid PostgREST schema cache issues with agent_type column.
  const { data: existing, error: checkError } = await supabase
    .from('agents')
    .select('id')
    .eq('team_id', teamId)
    .eq('agent_type' as never, agentType)
    .maybeSingle()

  if (checkError) {
    return { error: `Failed to check for existing agent: ${checkError.message}` }
  }
  if (existing) {
    return { error: `An agent of type "${agentType}" is already installed for this team.` }
  }

  // 1. Create agent row using only original columns (PostgREST schema cache safe)
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .insert({
      team_id: teamId,
      created_by: userId,
      name: definition.name,
      description: definition.description,
      palette: 'blue',
    })
    .select('id')
    .single()

  if (agentError || !agent) {
    return { error: agentError?.message ?? 'Failed to create agent' }
  }

  const agentId = agent.id

  // 2. Set agent_type via RPC to bypass PostgREST schema cache
  const { error: typeError } = await supabase.rpc(
    'set_agent_type' as never,
    {
      p_agent_id: agentId,
      p_agent_type: agentType,
    } as never
  )

  if (typeError) {
    // Non-fatal: agent_type column may not have RPC yet; log and continue.
    console.warn(`Could not set agent_type via RPC: ${typeError.message}`)
  }

  // 3. Create module rows and their workflows
  for (const moduleDef of definition.modules) {
    const { data: moduleRow, error: moduleError } = await supabase
      .from('agent_modules' as never)
      .insert({
        agent_id: agentId,
        module_type: moduleDef.moduleType,
        name: moduleDef.name,
        description: moduleDef.description,
        enabled: true,
        required_connections: moduleDef.requiredConnections,
        config: {},
      } as never)
      .select('id')
      .single()

    if (moduleError || !moduleRow) {
      return { error: `Failed to create module "${moduleDef.name}": ${moduleError?.message}` }
    }

    const moduleId = (moduleRow as { id: string }).id

    // 4. Create workflow rows for this module
    for (const workflowDef of moduleDef.workflows) {
      const { error: workflowError } = await supabase.from('agent_workflows' as never).insert({
        agent_id: agentId,
        module_id: moduleId,
        name: workflowDef.stepDescriptions.join(' → '),
        trigger_type: workflowDef.triggerType,
        cron_expression: workflowDef.cronExpression ?? null,
        status: 'active',
        step_descriptions: workflowDef.stepDescriptions,
      } as never)

      if (workflowError) {
        return {
          error: `Failed to create workflow for module "${moduleDef.name}": ${workflowError.message}`,
        }
      }
    }
  }

  return { agentId }
}
