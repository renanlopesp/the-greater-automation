import { createServiceRoleClient } from '@/lib/supabase/server'
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
 * 2. Creates 4 specialized agents (Estoquista, Vigia de Preco, Caixa, Atendente)
 * 3. Creates segment-specific knowledge skills for each agent
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

  for (const role of AGENT_ROLES) {
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        team_id: input.teamId,
        created_by: input.userId,
        name: role.name,
        description: role.description,
        system_prompt: `Você é o ${role.name}, assistente especializado da loja "${input.storeName}". ${role.description}`,
        palette: role.palette,
        model: 'gpt-4o',
      })
      .select('id')
      .single()

    if (agentError) {
      console.error(`[provision-store] Failed to create agent ${role.name}:`, agentError.message)
      continue
    }

    agentsCreated++

    // 3. Create segment-specific skill for this agent role
    const skill = segmentSkills[role.role]
    if (skill && agent) {
      const { error: skillError } = await supabase.from('agent_skills').insert({
        agent_id: agent.id,
        name: skill.title,
        description: `Conhecimento especializado do segmento para ${role.name}`,
        content: skill.content,
        type: 'knowledge',
        version: 1,
        metadata: { segment: input.segment, role: role.role },
        source: 'system',
      })

      if (!skillError) skillsCreated++
      else
        console.error(
          `[provision-store] Failed to create skill for ${role.name}:`,
          skillError.message
        )
    }
  }

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
 * Mark onboarding as completed for a store.
 */
export async function completeOnboarding(storeId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  await supabase.from('stores').update({ onboarding_completed: true }).eq('id', storeId)
}
