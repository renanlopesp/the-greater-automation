import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/anthropic'
import { buildOrchestratorSystemPrompt } from '@/lib/ai/platform-tools'
import { safeError } from '@/lib/safe-error'

/**
 * POST /api/agents/update-prompt — Update the Managed Agent's system prompt.
 *
 * Called after brand DNA analysis completes to upgrade the agent from
 * onboarding mode to full personalized mode. Also supports model upgrades.
 *
 * Request body (optional): { model?: "claude-opus-4-6" | "claude-sonnet-4-6" }
 */
export async function POST(request: NextRequest) {
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
    // ── Check agent exists ─────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: team } = await (serviceClient as any)
      .from('teams')
      .select('name, anthropic_agent_id, anthropic_env_id')
      .eq('id', teamId)
      .single()

    if (!team?.anthropic_agent_id) {
      return NextResponse.json(
        { error: 'Team has no provisioned agent. Call /api/agents/provision first.' },
        { status: 400 }
      )
    }

    // ── Parse optional body ────────────────────────────────────────────
    let requestedModel: string | undefined
    try {
      const body = await request.json()
      if (body?.model) requestedModel = body.model
    } catch {
      // No body or invalid JSON — that's fine, model stays unchanged
    }

    // ── Gather context for full prompt ─────────────────────────────────
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

    type BrandDnaType = {
      niche: string | null
      tone: string | null
      audience: string | null
      positioning: string | null
      words_to_use: string[] | null
      words_to_avoid: string[] | null
      store_name: string | null
    }

    // Always generate full mode — this endpoint is called after brand DNA
    const systemPrompt = buildOrchestratorSystemPrompt(
      team.name ?? 'Your workspace',
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
      'full'
    )

    // ── Update agent via Anthropic API ──────────────────────────────────
    const anthropic = getAnthropicClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: any = { system: systemPrompt }
    if (requestedModel) updatePayload.model = requestedModel

    await anthropic.beta.agents.update(team.anthropic_agent_id, updatePayload)

    return NextResponse.json({
      success: true,
      agentId: team.anthropic_agent_id,
      mode: 'full',
      ...(requestedModel ? { model: requestedModel } : {}),
    })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('update-agent-prompt', error, 'Failed to update agent prompt') },
      { status: 500 }
    )
  }
}
