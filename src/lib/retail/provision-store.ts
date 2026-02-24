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
  await provisionWorkflows(
    supabase,
    input.priorities,
    agentsByRole,
    input.teamId,
    input.userId,
    input.platform
  )

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
 *
 * Each workflow follows a 3-step pipeline:
 *   1. App step — fetches real data from Shopify via Composio
 *   2. AI step — formats the raw data into a readable Telegram message
 *   3. Send Telegram step — delivers the formatted message
 *
 * All workflows use scheduled (cron) triggers so they run automatically.
 * Only created for Shopify-connected stores (Nuvemshop uses direct API, not Composio).
 */
async function provisionWorkflows(
  supabase: ReturnType<typeof createServiceRoleClient>,
  priorities: Priority[],
  agentsByRole: Record<string, string>,
  teamId: string,
  userId: string,
  platform: Platform
) {
  // Only provision automated workflows for Shopify (uses Composio app steps)
  if (platform !== 'shopify') return

  type StepType =
    | 'http'
    | 'human_in_loop'
    | 'app'
    | 'ai'
    | 'flow_control'
    | 'web_scraping'
    | 'utility'
    | 'sequence'
  type WorkflowDef = {
    agentId: string
    name: string
    emoji: string
    description: string
    cronExpression: string
    steps: Array<{ type: StepType; name: string; config: Record<string, unknown> }>
  }

  const CRON_TZ = 'America/Sao_Paulo'
  const defs: WorkflowDef[] = []

  // 1. Low Stock Alert (estoquista) — every 6 hours
  if (priorities.includes('controle_de_estoque') && agentsByRole.estoquista) {
    defs.push({
      agentId: agentsByRole.estoquista,
      name: 'Low Stock Alert',
      emoji: '⚠️',
      description: 'Checks Shopify products every 6 hours and alerts on low stock via Telegram.',
      cronExpression: '0 */6 * * *',
      steps: [
        {
          type: 'app',
          name: 'Fetch Shopify Products',
          config: { app_id: 'shopify', action: 'SHOPIFY_GET_PRODUCTS', inputs: { limit: '250' } },
        },
        {
          type: 'ai',
          name: 'Analyze Stock Levels',
          config: {
            ai_action: 'transform',
            prompt_template:
              'You are a stock management assistant for a retail store. Analyze the following Shopify product inventory data and identify products with LOW STOCK (5 units or fewer across all variants).\n\nFormat the result as a concise Telegram message in Portuguese (BR) using Markdown formatting. Use emojis for visual clarity.\n\nIf products have low stock, list them with: product name, current stock quantity, and a ⚠️ warning.\nIf NO products have low stock, respond with: "✅ Estoque OK — nenhum produto com estoque baixo."\n\nProduct data:\n{{step_2}}',
            output_format: 'text',
            temperature: 0.3,
            max_tokens: 1000,
          },
        },
        {
          type: 'utility',
          name: 'Send Telegram Alert',
          config: {
            utility_type: 'send_telegram',
            telegram_template: '{{step_3.output.content}}',
            telegram_parse_mode: 'Markdown',
          },
        },
      ],
    })
  }

  // 2. Daily Sales Summary (caixa) — daily at 9 PM
  if (priorities.includes('resumo_de_vendas') && agentsByRole.caixa) {
    defs.push({
      agentId: agentsByRole.caixa,
      name: 'Daily Sales Summary',
      emoji: '📈',
      description: 'Fetches Shopify orders daily at 9 PM and sends a sales summary via Telegram.',
      cronExpression: '0 21 * * *',
      steps: [
        {
          type: 'app',
          name: 'Fetch Shopify Orders',
          config: { app_id: 'shopify', action: 'SHOPIFY_GET_ORDERS', inputs: {} },
        },
        {
          type: 'ai',
          name: 'Summarize Sales',
          config: {
            ai_action: 'summarize',
            prompt_template:
              'You are a sales analyst for a retail store. Analyze the following Shopify orders data and create a daily sales summary.\n\nFormat as a concise Telegram message in Portuguese (BR) using Markdown. Include:\n- Total number of orders today\n- Total revenue in R$\n- Top selling products (name and quantity)\n- Payment status breakdown\n\nUse 📈 emoji in the header. If no orders today, say "📈 Sem pedidos hoje."\n\nOrders data:\n{{step_2}}',
            output_format: 'text',
            temperature: 0.3,
            max_tokens: 1000,
          },
        },
        {
          type: 'utility',
          name: 'Send Telegram Summary',
          config: {
            utility_type: 'send_telegram',
            telegram_template: '{{step_3.output.content}}',
            telegram_parse_mode: 'Markdown',
          },
        },
      ],
    })
  }

  // 4. New Order Notification (caixa) — every hour
  if (priorities.includes('alertas_de_pedidos') && agentsByRole.caixa) {
    defs.push({
      agentId: agentsByRole.caixa,
      name: 'New Order Notification',
      emoji: '🛒',
      description: 'Checks Shopify for new orders every hour and notifies via Telegram.',
      cronExpression: '0 * * * *',
      steps: [
        {
          type: 'app',
          name: 'Fetch Recent Orders',
          config: { app_id: 'shopify', action: 'SHOPIFY_GET_ORDERS', inputs: {} },
        },
        {
          type: 'ai',
          name: 'Check New Orders',
          config: {
            ai_action: 'transform',
            prompt_template:
              'You are an order notification assistant for a retail store. Analyze the following Shopify orders data and identify any NEW orders placed in the last hour.\n\nFormat each new order as a Telegram notification in Portuguese (BR) using Markdown. Include: order number, customer name, items ordered, total value in R$.\n\nUse 🛒 emoji in the header. If no new orders in the last hour, say "🛒 Sem novos pedidos na última hora."\n\nOrders data:\n{{step_2}}',
            output_format: 'text',
            temperature: 0.2,
            max_tokens: 500,
          },
        },
        {
          type: 'utility',
          name: 'Send Telegram Notification',
          config: {
            utility_type: 'send_telegram',
            telegram_template: '{{step_3.output.content}}',
            telegram_parse_mode: 'Markdown',
          },
        },
      ],
    })
  }

  for (const def of defs) {
    const triggerConfig = {
      schedule_type: 'cron',
      cron_expression: def.cronExpression,
      timezone: CRON_TZ,
    }

    // 1. Create the workflow record
    const { data: wf, error: wfError } = await supabase
      .from('workflows')
      .insert({
        team_id: teamId,
        created_by: userId,
        name: def.name,
        emoji: def.emoji,
        status: 'published',
      })
      .select('id')
      .single()

    if (wfError || !wf) {
      console.error(`[provision-store] Failed to create workflow "${def.name}":`, wfError?.message)
      continue
    }

    // 2. Create scheduled trigger (pg_cron auto-registered by trg_manage_scheduled_cron)
    const { error: triggerError } = await supabase.from('workflow_triggers').insert({
      workflow_id: wf.id,
      type: 'scheduled' as const,
      config: triggerConfig as unknown as Json,
    })
    if (triggerError) {
      console.error(
        `[provision-store] Failed to create trigger for "${def.name}":`,
        triggerError.message
      )
    }

    // 3. Create 3-step pipeline: app → ai → send_telegram
    for (const [i, step] of def.steps.entries()) {
      const { error: stepError } = await supabase.from('workflow_steps').insert({
        workflow_id: wf.id,
        position: i,
        type: step.type,
        name: step.name,
        config: step.config as unknown as Json,
      })
      if (stepError) {
        console.error(
          `[provision-store] Failed to create step "${step.name}" for "${def.name}":`,
          stepError.message
        )
      }
    }

    // 4. Link to agent via agent_workflows
    const { error: linkError } = await supabase.from('agent_workflows').insert({
      agent_id: def.agentId,
      workflow_id: wf.id,
      name: def.name,
      description: def.description,
      is_enabled: true,
      source: 'provision',
      trigger_config: triggerConfig as unknown as Json,
      actions: [] as unknown as Json,
    })
    if (linkError) {
      console.error(
        `[provision-store] Failed to link workflow "${def.name}" to agent:`,
        linkError.message
      )
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
