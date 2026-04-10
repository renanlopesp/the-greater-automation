import 'server-only'
import { getAnthropicClient } from '@/lib/anthropic'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildOrchestratorSystemPrompt } from '@/lib/ai/platform-tools'
import { getTeamPlan } from '@/lib/billing/feature-gate'

type BrandDnaType = {
  niche: string | null
  tone: string | null
  audience: string | null
  positioning: string | null
  words_to_use: string[] | null
  words_to_avoid: string[] | null
  store_name: string | null
}

/**
 * Provision a Managed Agent + Environment for a team.
 *
 * Two-phase provisioning:
 * - If brand DNA exists → full mode prompt
 * - If no brand DNA → onboarding mode prompt
 *
 * Idempotent: if the team already has an agent_id + env_id, returns them directly.
 */
export async function provisionAgent(
  teamId: string,
  userId: string
): Promise<{ agentId: string; envId: string; created: boolean; mode?: string; model?: string }> {
  const serviceClient = createServiceRoleClient()

  // ── Check if already provisioned ───────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: team } = await (serviceClient as any)
    .from('teams')
    .select('name, anthropic_agent_id, anthropic_env_id')
    .eq('id', teamId)
    .single()

  if (team?.anthropic_agent_id && team?.anthropic_env_id) {
    return {
      agentId: team.anthropic_agent_id,
      envId: team.anthropic_env_id,
      created: false,
    }
  }

  // ── Gather context for system prompt ────────────────────────────────
  const [{ data: teamSkills }, { data: store }, { data: brandDna }] = await Promise.all([
    serviceClient
      .from('skills' as never)
      .select('slug, name, description, category, status')
      .eq('team_id' as never, teamId)
      .order('name' as never),
    serviceClient
      .from('stores')
      .select('id, name, segment, platform')
      .eq('team_id', teamId)
      .limit(1)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (serviceClient as any)
      .from('brand_dna')
      .select('niche, tone, audience, positioning, words_to_use, words_to_avoid, store_name')
      .eq('team_id', teamId)
      .single(),
  ])

  // ── Determine prompt mode ──────────────────────────────────────────
  const hasBrandDna = brandDna && brandDna.niche
  const promptMode = hasBrandDna ? 'full' : 'onboarding'

  const hasProducts = store
    ? await serviceClient
        .from('store_products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .then((r) => (r.count ?? 0) > 0)
    : false

  const systemPrompt = buildOrchestratorSystemPrompt(
    team?.name ?? 'Your workspace',
    (teamSkills as Array<{
      slug: string
      name: string
      description: string | null
      category: string
      status: string
    }> | null) ?? [],
    store
      ? {
          storeName: store.name,
          segment: store.segment,
          platform: store.platform,
          hasProducts,
        }
      : undefined,
    brandDna as BrandDnaType | null | undefined,
    promptMode
  )

  // ── Determine model from plan ──────────────────────────────────────
  const plan = await getTeamPlan(teamId)
  const model =
    plan.planId === 'pro' || plan.planId === 'enterprise' ? 'claude-opus-4-6' : 'claude-sonnet-4-6'

  // ── Build MCP server URL for the agent ─────────────────────────────
  const mcpBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  const mcpSecret = process.env.MCP_AUTH_TOKEN ?? ''
  const mcpUrl = `${mcpBaseUrl}/mcp-tools?team_id=${teamId}&user_id=${userId}${store ? `&store_id=${store.id}` : ''}&secret=${mcpSecret}`

  // ── Create Managed Agent + Environment ──────────────────────────────
  const anthropic = getAnthropicClient()

  const [agent, env] = await Promise.all([
    anthropic.beta.agents.create({
      name: 'Snew',
      model,
      system: systemPrompt,
      mcp_servers: [{ type: 'url', name: 'snew-tools', url: mcpUrl }],
      tools: [
        {
          type: 'mcp_toolset',
          mcp_server_name: 'snew-tools',
          default_config: { enabled: true, permission_policy: { type: 'always_allow' } },
        },
      ],
      description: `Snew assistant for team ${team?.name ?? teamId}`,
    }),
    anthropic.beta.environments.create({
      name: `snew-env-${teamId}`,
      description: `Environment for team ${team?.name ?? teamId}`,
    }),
  ])

  // ── Persist IDs ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (serviceClient as any)
    .from('teams')
    .update({
      anthropic_agent_id: agent.id,
      anthropic_env_id: env.id,
    })
    .eq('id', teamId)

  return {
    agentId: agent.id,
    envId: env.id,
    created: true,
    mode: promptMode,
    model,
  }
}
