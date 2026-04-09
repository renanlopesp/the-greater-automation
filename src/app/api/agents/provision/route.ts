import { NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/anthropic'
import { buildOrchestratorSystemPrompt } from '@/lib/ai/platform-tools'
import { safeError } from '@/lib/safe-error'

/**
 * POST /api/agents/provision — Provision a Managed Agent + Environment for a team.
 *
 * Idempotent: if the team already has an agent_id + env_id, returns them directly.
 * Otherwise creates both via the Anthropic Managed Agents API and persists the IDs.
 */
export async function POST() {
  const supabase = await createServerClient()
  const serviceClient = createServiceRoleClient()

  // ── Auth ───────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!membership) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  const teamId = membership.team_id

  try {
    // ── Check if already provisioned ───────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: team } = await (serviceClient as any)
      .from('teams')
      .select('name, anthropic_agent_id, anthropic_env_id')
      .eq('id', teamId)
      .single()

    if (team?.anthropic_agent_id && team?.anthropic_env_id) {
      return NextResponse.json({
        agentId: team.anthropic_agent_id,
        envId: team.anthropic_env_id,
      })
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
      brandDna as
        | {
            niche: string | null
            tone: string | null
            audience: string | null
            positioning: string | null
            words_to_use: string[] | null
            words_to_avoid: string[] | null
            store_name: string | null
          }
        | null
        | undefined
    )

    // ── Create Managed Agent + Environment ──────────────────────────────
    const anthropic = getAnthropicClient()

    const [agent, env] = await Promise.all([
      anthropic.beta.agents.create({
        name: 'Snew',
        model: 'claude-sonnet-4-6',
        system: systemPrompt,
        tools: [{ type: 'agent_toolset_20260401' }],
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

    return NextResponse.json({ agentId: agent.id, envId: env.id })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('provision-agent', error, 'Failed to provision agent') },
      { status: 500 }
    )
  }
}
