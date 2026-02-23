import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import {
  AGENT_ROLES,
  SEGMENT_SKILLS,
  type Segment,
  type Platform,
  type Priority,
} from './segment-skills'

export interface ProvisionStoreInput {
  userId: string
  teamId: string
  storeName: string
  segment: Segment
  platform: Platform
  platformUrl?: string
  priorities: Priority[]
}

export interface ProvisionStoreResult {
  storeId: string
  agentsCreated: number
  skillsCreated: number
}

/**
 * Provisions a new retail store for a team:
 * 1. Creates the store record
 * 2. Creates 4 specialized agents (Stock Manager, Price Monitor, Sales Analyst, Customer Service)
 * 3. Creates segment-specific knowledge skills for each agent
 * 3b. Creates pre-built workflows based on selected priorities
 * 4. Creates default global stock alert config
 * 5. Sets has_store=true on the team
 */
export async function provisionStore(input: ProvisionStoreInput): Promise<ProvisionStoreResult> {
  const supabase = createServiceRoleClient()

  // 1. Create store record
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .insert({
      team_id: input.teamId,
      name: input.storeName,
      segment: input.segment,
      platform: input.platform,
      platform_url: input.platformUrl ?? null,
      priorities: input.priorities,
      onboarding_completed: false,
    })
    .select('id')
    .single()

  if (storeError) {
    if (storeError.code === '23505') {
      throw new Error('Store already exists for this team')
    }
    throw new Error(`Failed to create store: ${storeError.message}`)
  }

  // 2. Create 4 specialized agents
  let agentsCreated = 0
  let skillsCreated = 0
  const segmentSkills = SEGMENT_SKILLS[input.segment]
  const agentsByRole: Record<string, string> = {} // role -> agent id

  // Build default notification_settings per role based on priorities
  const roleNotificationDefaults: Record<string, Record<string, unknown>> = {}
  if (input.priorities.includes('controle_de_estoque')) {
    roleNotificationDefaults.estoquista = { telegram_enabled: true, report_hour: 21 }
  }
  if (input.priorities.includes('monitorar_concorrencia')) {
    roleNotificationDefaults.vigia_de_preco = { telegram_enabled: true, report_hour: 21 }
  }
  if (input.priorities.includes('resumo_de_vendas')) {
    roleNotificationDefaults.caixa = { telegram_enabled: true, report_hour: 21 }
  }

  for (const role of AGENT_ROLES) {
    const notificationSettings = roleNotificationDefaults[role.role] ?? {}

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        team_id: input.teamId,
        created_by: input.userId,
        name: role.name,
        description: role.description,
        system_prompt: `You are the ${role.name}, a specialized assistant for the store "${input.storeName}". ${role.description}`,
        palette: role.palette,
        model: 'gpt-4o',
        notification_settings: notificationSettings as unknown as Json,
      })
      .select('id')
      .single()

    if (agentError) {
      console.error(`[provision-store] Failed to create agent ${role.name}:`, agentError.message)
      continue
    }

    agentsCreated++
    agentsByRole[role.role] = agent.id

    // 3. Create segment-specific skill for this agent role
    const skill = segmentSkills[role.role]
    if (skill && agent) {
      const { error: skillError } = await supabase.from('agent_skills').insert({
        agent_id: agent.id,
        name: skill.title,
        description: `Specialized segment knowledge for ${role.name}`,
        content: skill.content,
        type: 'knowledge',
        version: 1,
        metadata: { segment: input.segment, role: role.role },
        source: 'manual',
      })

      if (!skillError) skillsCreated++
      else
        console.error(
          `[provision-store] Failed to create skill for ${role.name}:`,
          skillError.message
        )
    }
  }

  // 3b. Create pre-built workflows based on selected priorities
  await provisionWorkflows(supabase, input.priorities, agentsByRole)

  // 4. Create default global stock alert (threshold=5)
  if (input.priorities.includes('controle_de_estoque')) {
    await supabase.from('store_stock_alerts').insert({
      store_id: store.id,
      product_id: null, // global default
      threshold: 5,
      is_enabled: true,
    })
  }

  // 4b. Set default daily summary schedule if resumo_de_vendas is a priority
  if (input.priorities.includes('resumo_de_vendas')) {
    await supabase
      .from('stores')
      .update({
        settings: {
          daily_summary_hour: 21,
          daily_summary_enabled: true,
        },
      })
      .eq('id', store.id)
  }

  // 5. Set has_store=true on the team
  await supabase.from('teams').update({ has_store: true }).eq('id', input.teamId)

  return {
    storeId: store.id,
    agentsCreated,
    skillsCreated,
  }
}

/**
 * Creates pre-built workflows for agents based on the user's selected priorities.
 */
async function provisionWorkflows(
  supabase: ReturnType<typeof createServiceRoleClient>,
  priorities: Priority[],
  agentsByRole: Record<string, string>
) {
  const workflows: Array<{
    agent_id: string
    name: string
    description: string
    is_enabled: boolean
    trigger_config: Record<string, unknown>
    actions: Array<Record<string, unknown>>
  }> = []

  // Stock Manager: Low Stock Alert
  if (priorities.includes('controle_de_estoque') && agentsByRole.estoquista) {
    workflows.push({
      agent_id: agentsByRole.estoquista,
      name: 'Low Stock Alert',
      description: 'Sends a Telegram alert when a product falls below the stock threshold.',
      is_enabled: true,
      trigger_config: { type: 'stock_below_threshold' },
      actions: [
        {
          type: 'send_telegram',
          config: {
            template:
              'Low stock alert: {{product_name}} has {{current_stock}} units (threshold: {{threshold}})',
          },
        },
      ],
    })
  }

  // Price Monitor: Daily Price Check
  if (priorities.includes('monitorar_concorrencia') && agentsByRole.vigia_de_preco) {
    workflows.push({
      agent_id: agentsByRole.vigia_de_preco,
      name: 'Price Change Alert',
      description: 'Checks competitor prices daily and sends a Telegram summary of changes.',
      is_enabled: true,
      trigger_config: { type: 'scheduled_daily' },
      actions: [
        {
          type: 'send_telegram',
          config: {
            template: 'Daily competitor price report for {{date}}',
          },
        },
      ],
    })
  }

  // Sales Analyst: Daily Sales Summary
  if (priorities.includes('resumo_de_vendas') && agentsByRole.caixa) {
    workflows.push({
      agent_id: agentsByRole.caixa,
      name: 'Daily Sales Summary',
      description: 'Generates and sends a daily sales report via Telegram at the configured hour.',
      is_enabled: true,
      trigger_config: { type: 'scheduled_daily' },
      actions: [
        {
          type: 'send_telegram',
          config: {
            template: 'Daily sales summary for {{date}}',
          },
        },
      ],
    })
  }

  // Sales Analyst: New Order Notification
  if (priorities.includes('alertas_de_pedidos') && agentsByRole.caixa) {
    workflows.push({
      agent_id: agentsByRole.caixa,
      name: 'New Order Notification',
      description: 'Sends an instant Telegram notification when a new order is placed.',
      is_enabled: true,
      trigger_config: { type: 'new_order' },
      actions: [
        {
          type: 'send_telegram',
          config: {
            template: 'New order #{{order_id}}: {{item_count}} items — {{total}}',
          },
        },
      ],
    })
  }

  // Batch insert all workflows
  for (const wf of workflows) {
    const { error } = await supabase.from('agent_workflows').insert({
      agent_id: wf.agent_id,
      name: wf.name,
      description: wf.description,
      is_enabled: wf.is_enabled,
      trigger_config: wf.trigger_config as unknown as Json,
      actions: wf.actions as unknown as Json,
      source: 'manual',
    })
    if (error) {
      console.error(`[provision-store] Failed to create workflow "${wf.name}":`, error.message)
    }
  }
}

/**
 * Mark onboarding as completed for a store.
 */
export async function completeOnboarding(storeId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase.from('stores').update({ onboarding_completed: true }).eq('id', storeId)
}
