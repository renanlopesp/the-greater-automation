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

  // 1. Create store record (or update if already created by OAuth callback)
  const { data: existingStore } = await supabase
    .from('stores')
    .select('id')
    .eq('team_id', input.teamId)
    .limit(1)
    .single()

  let store: { id: string }
  if (existingStore) {
    const { data: updated, error: updateError } = await supabase
      .from('stores')
      .update({
        name: input.storeName,
        segment: input.segment,
        platform: input.platform,
        platform_url: input.platformUrl ?? null,
        priorities: input.priorities,
        onboarding_completed: false,
      })
      .eq('id', existingStore.id)
      .select('id')
      .single()
    if (updateError) throw new Error(`Failed to update store: ${updateError.message}`)
    store = updated
  } else {
    const { data: created, error: storeError } = await supabase
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
      if (storeError.code === '23505') throw new Error('Store already exists for this team')
      throw new Error(`Failed to create store: ${storeError.message}`)
    }
    store = created
  }

  // 2. Create specialized agents (only if priorities were selected — legacy onboarding)
  let agentsCreated = 0
  let skillsCreated = 0

  if (input.priorities.length > 0) {
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

    // Create all agents + their skills in parallel (each pair is independent)
    const agentResults = await Promise.allSettled(
      AGENT_ROLES.map(async (role) => {
        const notificationSettings = roleNotificationDefaults[role.role] ?? {}

        const { data: agent, error: agentError } = await supabase
          .from('agents')
          .insert({
            team_id: input.teamId,
            created_by: input.userId,
            name: role.name,
            description: role.description,
            system_prompt: role.is_orchestrator
              ? null // orchestrator prompt is built dynamically
              : `You are the ${role.name}, a specialized assistant for the store "${input.storeName}". ${role.description}`,
            palette: role.palette,
            model: 'gpt-4o',
            is_orchestrator: role.is_orchestrator ?? false,
            notification_settings: notificationSettings as unknown as Json,
          })
          .select('id')
          .single()

        if (agentError) {
          console.error(
            `[provision-store] Failed to create agent ${role.name}:`,
            agentError.message
          )
          return null
        }

        // 3. Create segment-specific skill for this agent role (skip orchestrator — it delegates)
        const skill = role.is_orchestrator ? undefined : segmentSkills[role.role]
        if (skill && agent) {
          const { error: skillError } = await supabase.from('agent_skills').insert({
            agent_id: agent.id,
            name: skill.title,
            description: `Conhecimento especializado do segmento para ${role.name}`,
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

        return { role: role.role, agentId: agent.id }
      })
    )

    for (const result of agentResults) {
      if (result.status === 'fulfilled' && result.value) {
        agentsCreated++
        agentsByRole[result.value.role] = result.value.agentId
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
  } // end if (priorities.length > 0)

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
  // Only provision automated workflows for connected platforms
  if (platform !== 'shopify' && platform !== 'nuvemshop') return

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

  // Platform-specific app step config
  const isNuvemshop = platform === 'nuvemshop'
  const platformLabel = isNuvemshop ? 'Nuvemshop' : 'Shopify'
  const productsAppStep = isNuvemshop
    ? { app_id: 'nuvemshop', action: 'NUVEMSHOP_GET_PRODUCTS', inputs: {} }
    : { app_id: 'shopify', action: 'SHOPIFY_GET_PRODUCTS', inputs: { limit: '250' } }
  const ordersAppStep = isNuvemshop
    ? { app_id: 'nuvemshop', action: 'NUVEMSHOP_GET_ORDERS', inputs: {} }
    : { app_id: 'shopify', action: 'SHOPIFY_GET_ORDERS', inputs: {} }

  // 1. Low Stock Alert (estoquista) — every 6 hours
  if (priorities.includes('controle_de_estoque') && agentsByRole.estoquista) {
    defs.push({
      agentId: agentsByRole.estoquista,
      name: 'Alerta de Estoque Baixo',
      emoji: '⚠️',
      description: `Verifica produtos ${platformLabel} a cada 6 horas e alerta sobre estoque baixo via Telegram.`,
      cronExpression: '0 */6 * * *',
      steps: [
        {
          type: 'app',
          name: `Buscar Produtos ${platformLabel}`,
          config: productsAppStep,
        },
        {
          type: 'ai',
          name: 'Analisar Níveis de Estoque',
          config: {
            ai_action: 'transform',
            prompt_template: `You are a stock management assistant for a retail store. Analyze the following ${platformLabel} product inventory data and identify products with LOW STOCK (5 units or fewer across all variants).\n\nFormat the result as a concise Telegram message in Portuguese (BR) using Markdown formatting. Use emojis for visual clarity.\n\nIf products have low stock, list them with: product name, current stock quantity, and a ⚠️ warning.\nIf NO products have low stock, respond with: "✅ Estoque OK — nenhum produto com estoque baixo."\n\nProduct data:\n{{step_2}}`,
            output_format: 'text',
            temperature: 0.3,
            max_tokens: 1000,
          },
        },
        {
          type: 'utility',
          name: 'Enviar Alerta Telegram',
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
      name: 'Resumo Diário de Vendas',
      emoji: '📈',
      description: `Busca pedidos ${platformLabel} diariamente às 21h e envia um resumo de vendas via Telegram.`,
      cronExpression: '0 21 * * *',
      steps: [
        {
          type: 'app',
          name: `Buscar Pedidos ${platformLabel}`,
          config: ordersAppStep,
        },
        {
          type: 'ai',
          name: 'Resumir Vendas',
          config: {
            ai_action: 'summarize',
            prompt_template: `You are a sales analyst for a retail store. Analyze the following ${platformLabel} orders data and create a daily sales summary.\n\nFormat as a concise Telegram message in Portuguese (BR) using Markdown. Include:\n- Total number of orders today\n- Total revenue in R$\n- Top selling products (name and quantity)\n- Payment status breakdown\n\nUse 📈 emoji in the header. If no orders today, say "📈 Sem pedidos hoje."\n\nOrders data:\n{{step_2}}`,
            output_format: 'text',
            temperature: 0.3,
            max_tokens: 1000,
          },
        },
        {
          type: 'utility',
          name: 'Enviar Resumo Telegram',
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
      name: 'Notificação de Novo Pedido',
      emoji: '🛒',
      description: `Verifica novos pedidos ${platformLabel} a cada hora e notifica via Telegram.`,
      cronExpression: '0 * * * *',
      steps: [
        {
          type: 'app',
          name: 'Buscar Pedidos Recentes',
          config: ordersAppStep,
        },
        {
          type: 'ai',
          name: 'Verificar Novos Pedidos',
          config: {
            ai_action: 'transform',
            prompt_template: `You are an order notification assistant for a retail store. Analyze the following ${platformLabel} orders data and identify any NEW orders placed in the last hour.\n\nFormat each new order as a Telegram notification in Portuguese (BR) using Markdown. Include: order number, customer name, items ordered, total value in R$.\n\nUse 🛒 emoji in the header. If no new orders in the last hour, say "🛒 Sem novos pedidos na última hora."\n\nOrders data:\n{{step_2}}`,
            output_format: 'text',
            temperature: 0.2,
            max_tokens: 500,
          },
        },
        {
          type: 'utility',
          name: 'Enviar Notificação Telegram',
          config: {
            utility_type: 'send_telegram',
            telegram_template: '{{step_3.output.content}}',
            telegram_parse_mode: 'Markdown',
          },
        },
      ],
    })
  }

  // Create all workflows in parallel (each definition is independent)
  await Promise.allSettled(
    defs.map(async (def) => {
      const triggerConfig = {
        schedule_type: 'cron',
        cron_expression: def.cronExpression,
        timezone: CRON_TZ,
      }

      // 1. Create the workflow record (must be first — FK dependency)
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
        console.error(
          `[provision-store] Failed to create workflow "${def.name}":`,
          wfError?.message
        )
        return
      }

      // 2. Create trigger, steps (batch), and agent link in parallel
      const [triggerResult, stepsResult, linkResult] = await Promise.allSettled([
        supabase.from('workflow_triggers').insert({
          workflow_id: wf.id,
          type: 'scheduled' as const,
          config: triggerConfig as unknown as Json,
        }),
        supabase.from('workflow_steps').insert(
          def.steps.map((step, i) => ({
            workflow_id: wf.id,
            position: i,
            type: step.type,
            name: step.name,
            config: step.config as unknown as Json,
          }))
        ),
        supabase.from('agent_workflows').insert({
          agent_id: def.agentId,
          workflow_id: wf.id,
          name: def.name,
          description: def.description,
          is_enabled: true,
          source: 'provision',
          trigger_config: triggerConfig as unknown as Json,
          actions: [] as unknown as Json,
        }),
      ])

      if (triggerResult.status === 'rejected' || triggerResult.value.error) {
        console.error(
          `[provision-store] Failed to create trigger for "${def.name}":`,
          triggerResult.status === 'rejected'
            ? triggerResult.reason
            : triggerResult.value.error?.message
        )
      }
      if (stepsResult.status === 'rejected' || stepsResult.value.error) {
        console.error(
          `[provision-store] Failed to create steps for "${def.name}":`,
          stepsResult.status === 'rejected' ? stepsResult.reason : stepsResult.value.error?.message
        )
      }
      if (linkResult.status === 'rejected' || linkResult.value.error) {
        console.error(
          `[provision-store] Failed to link workflow "${def.name}" to agent:`,
          linkResult.status === 'rejected' ? linkResult.reason : linkResult.value.error?.message
        )
      }
    })
  )
}

/**
 * Mark onboarding as completed for a store.
 */
export async function completeOnboarding(storeId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase.from('stores').update({ onboarding_completed: true }).eq('id', storeId)
}
