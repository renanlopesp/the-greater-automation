export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { type UIMessage, convertToModelMessages } from 'ai'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { runAgentChat, type AgentConfig } from '@/lib/ai/agent-chat'
import { tokensToCredits } from '@/lib/billing/credits'
import { buildPlatformTools, buildOrchestratorSystemPrompt } from '@/lib/ai/platform-tools'

/**
 * POST /api/chat — Orchestrator chat endpoint.
 * The orchestrator is NOT an agent. It uses its own `conversations` + `conversation_messages` tables.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const serviceClient = createServiceRoleClient()

  // 1. Authenticate
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get user's team
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

  // 3. Parse request body
  const body = await request.json()
  let userMessage: string
  const existingConvId = body.conversationId as string | undefined

  if (body.messages && Array.isArray(body.messages)) {
    const msgs = body.messages as UIMessage[]
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    if (!lastUser) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }
    const textPart = lastUser.parts?.find((p) => p.type === 'text')
    userMessage = textPart ? (textPart as { type: 'text'; text: string }).text : ''
  } else {
    userMessage = body.message as string
  }

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // 4. Load team context in parallel
  const [{ data: teamSkills }, { data: store }, { data: team }, { data: brandDna }] =
    await Promise.all([
      serviceClient
        .from('skills' as never)
        .select('slug, name, description, category, status')
        .eq('team_id' as never, teamId)
        .order('name' as never),
      serviceClient
        .from('stores')
        .select('id, name, segment, platform, platform_access_token')
        .eq('team_id', teamId)
        .limit(1)
        .single(),
      serviceClient.from('teams').select('name').eq('id', teamId).single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (serviceClient as any)
        .from('brand_dna')
        .select('niche, tone, audience, positioning, words_to_use, words_to_avoid, store_name')
        .eq('team_id', teamId)
        .single(),
    ])

  const storeId = store?.id ?? null

  const hasProducts = store
    ? ((
        await serviceClient
          .from('store_products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
      ).count ?? 0) > 0
    : false

  // 5. Find or create conversation in `conversations` table (NOT agent_conversations)
  let conversationId = existingConvId
  if (!conversationId) {
    // Find active conversation for this user+team
    const { data: activeConv } = await serviceClient
      .from('conversations' as never)
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (activeConv) {
      conversationId = (activeConv as { id: string }).id
    } else {
      const { data: conv } = await (
        serviceClient as unknown as {
          from: (t: string) => {
            insert: (d: unknown) => {
              select: (s: string) => { single: () => Promise<{ data: { id: string } | null }> }
            }
          }
        }
      )
        .from('conversations')
        .insert({
          team_id: teamId,
          user_id: user.id,
          title: userMessage.slice(0, 100),
          is_active: true,
        })
        .select('id')
        .single()

      conversationId = conv?.id
    }
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  // 6. Insert user message into `conversation_messages` (NOT agent_messages)
  await (
    serviceClient as unknown as {
      from: (t: string) => { insert: (d: unknown) => Promise<unknown> }
    }
  )
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
    })

  // 7. Build messages for the AI model
  let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>

  if (body.messages && Array.isArray(body.messages)) {
    modelMessages = await convertToModelMessages(body.messages as UIMessage[])
  } else {
    // Load from conversation_messages
    const { data: historyRows } = await (
      serviceClient as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              k: string,
              v: string
            ) => {
              order: (
                k: string,
                o: { ascending: boolean }
              ) => {
                limit: (n: number) => Promise<{
                  data: Array<{ role: string; content: string }> | null
                }>
              }
            }
          }
        }
      }
    )
      .from('conversation_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50)

    modelMessages = (historyRows ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  }

  // 8. Build orchestrator system prompt
  const orchestratorPrompt = buildOrchestratorSystemPrompt(
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

  // 9. Platform tools (SNEW_ASK_AGENT, retail tools, etc.)
  const platformTools = buildPlatformTools(user.id, teamId, undefined, storeId ?? undefined)

  // 10. Load team connections for Composio
  const { data: teamMembers } = await serviceClient
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
  const teamUserIds = (teamMembers ?? []).map((m) => m.user_id)

  const { data: allConnections } =
    teamUserIds.length > 0
      ? await serviceClient
          .from('app_connections')
          .select('app_id, composio_connection_id, user_id')
          .in('user_id', teamUserIds)
      : { data: null }

  const appIds = new Set<string>()
  let connectedAccountMap: Record<string, string> | undefined
  let entityId = user.id

  if (allConnections && allConnections.length > 0) {
    connectedAccountMap = {}
    const ownerCounts = new Map<string, number>()
    for (const row of allConnections) {
      appIds.add(row.app_id)
      if (row.composio_connection_id) {
        if (!connectedAccountMap[row.app_id] || row.user_id === user.id) {
          connectedAccountMap[row.app_id] = row.composio_connection_id
        }
        ownerCounts.set(row.user_id, (ownerCounts.get(row.user_id) ?? 0) + 1)
      }
    }
    if (!ownerCounts.has(user.id) && ownerCounts.size > 0) {
      let maxCount = 0
      for (const [ownerId, count] of ownerCounts) {
        if (count > maxCount) {
          maxCount = count
          entityId = ownerId
        }
      }
    }
  }

  if (store?.platform && store.platform !== 'manual' && store.platform !== 'nuvemshop') {
    appIds.add(store.platform)
  }

  // 11. Run AI chat
  const agentConfig: AgentConfig = {
    id: 'orchestrator',
    name: 'Snew',
    system_prompt: null,
    model: 'gpt-5.2',
    temperature: null,
    max_tokens: 16384,
  }

  const convId = conversationId // capture for closure

  try {
    const result = await runAgentChat({
      userId: entityId,
      agent: agentConfig,
      messages: modelMessages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
      systemPrompt: orchestratorPrompt,
      relayTools: platformTools,
      connectedAppIds: appIds.size > 0 ? [...appIds] : undefined,
      connectedAccountMap,
      onFinish: async ({ text, usage }) => {
        if (text) {
          await (
            serviceClient as unknown as {
              from: (t: string) => { insert: (d: unknown) => Promise<unknown> }
            }
          )
            .from('conversation_messages')
            .insert({
              conversation_id: convId,
              role: 'assistant',
              content: text,
            })
        }
        const credits = tokensToCredits(usage?.totalTokens ?? 0)
        if (credits > 0) {
          await serviceClient.rpc('increment_ai_credits', {
            p_team_id: teamId,
            p_credits: credits,
          })
        }
      },
    })

    const response = result.toUIMessageStreamResponse({ sendReasoning: true, sendSources: true })
    const headers = new Headers(response.headers)
    headers.set('X-Conversation-Id', convId)

    return new Response(response.body, { status: response.status, headers })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Chat failed'
    console.error('[orchestrator-chat] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
