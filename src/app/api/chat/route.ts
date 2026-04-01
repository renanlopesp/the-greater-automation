export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { type UIMessage, convertToModelMessages } from 'ai'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { safeError } from '@/lib/safe-error'
import { runAgentChat, type AgentConfig } from '@/lib/ai/agent-chat'
import { tokensToCredits } from '@/lib/billing/credits'
import { buildPlatformTools, buildOrchestratorSystemPrompt } from '@/lib/ai/platform-tools'

/**
 * POST /api/chat — Orchestrator chat endpoint.
 * Queries are parallelized to minimize time-to-first-token.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const serviceClient = createServiceRoleClient()

  // ── 1. Auth (sequential — required for everything) ────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body in parallel with team lookup
  const [body, { data: membership }] = await Promise.all([
    request.json(),
    supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1).single(),
  ])

  if (!membership) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  const teamId = membership.team_id

  // ── 2. Parse user message ─────────────────────────────────────────────
  let userMessage: string
  const existingConvId = body.conversationId as string | undefined
  const taskId = body.taskId as string | undefined

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

  // ── 3. Parallel fetch: team context + conversation + connections ──────
  // All of these only need teamId + user.id — run together instead of sequentially.
  const [
    { data: teamSkills },
    { data: store },
    { data: team },
    { data: brandDna },
    conversationId,
    allConnections,
  ] = await Promise.all([
    // Team context (skills, store, team name, brand DNA)
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
    serviceClient.from('teams').select('name').eq('id', teamId).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (serviceClient as any)
      .from('brand_dna')
      .select('niche, tone, audience, positioning, words_to_use, words_to_avoid, store_name')
      .eq('team_id', teamId)
      .single(),

    // Conversation: find or create (was sequential step 5-6)
    (async (): Promise<string | null> => {
      if (existingConvId) return existingConvId
      const { data: activeConv } = await serviceClient
        .from('conversations' as never)
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (activeConv) return (activeConv as { id: string }).id
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
      return conv?.id ?? null
    })(),

    // Composio connections (was sequential steps 10-11)
    (async () => {
      const { data: members } = await serviceClient
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
      const userIds = (members ?? []).map((m) => m.user_id)
      if (userIds.length === 0) return null
      const { data } = await serviceClient
        .from('app_connections')
        .select('app_id, composio_connection_id, user_id')
        .in('user_id', userIds)
      return data
    })(),
  ])

  if (!conversationId) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  const storeId = store?.id ?? null

  // ── 4. Insert message (fire-and-forget) + hasProducts + model messages ─
  // User message insert doesn't need to block the AI response.
  void (
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

  const [hasProducts, modelMessages] = await Promise.all([
    store
      ? serviceClient
          .from('store_products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .then((r) => (r.count ?? 0) > 0)
      : Promise.resolve(false),
    body.messages && Array.isArray(body.messages)
      ? convertToModelMessages(body.messages as UIMessage[])
      : (async () => {
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

          return (historyRows ?? [])
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        })(),
  ])

  // ── 5. Calendar skill: fire-and-forget (background) ───────────────────
  let skillContext = ''
  if (taskId) {
    const lowerMsg = userMessage.toLowerCase()
    // Only trigger calendar generation for explicit generation requests, not modifications
    const isModificationRequest =
      lowerMsg.includes('remov') ||
      lowerMsg.includes('limp') ||
      lowerMsg.includes('delet') ||
      lowerMsg.includes('filtr') ||
      lowerMsg.includes('alter') ||
      lowerMsg.includes('modif') ||
      lowerMsg.includes('manten') ||
      lowerMsg.includes('deixe') ||
      lowerMsg.includes('atuali')
    const isCalendarRequest =
      !isModificationRequest &&
      (lowerMsg.includes('calendário') ||
        lowerMsg.includes('calendario') ||
        lowerMsg.includes('sazonal') ||
        lowerMsg.includes('seasonal') ||
        lowerMsg.includes('datas sazonais'))

    if (isCalendarRequest) {
      // Mark task as running immediately
      await serviceClient
        .from('tasks' as never)
        .update({
          skill_status: 'running',
          active_skill: 'seasonal-calendar',
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id' as never, taskId)

      // Generate in background — useTask polling picks up the result
      void (async () => {
        try {
          const [{ data: bd }, { data: prods }] = await Promise.all([
            serviceClient
              .from('brand_dna' as never)
              .select('niche, audience, positioning, tone, average_ticket, opportunities')
              .eq('team_id' as never, teamId)
              .single(),
            serviceClient
              .from('store_products')
              .select('name, price')
              .eq('team_id' as never, teamId)
              .limit(50),
          ])

          const { generateCalendar } = await import('@/lib/ai/seasonal-campaign-generator')
          const calendarData = await generateCalendar({
            brandDna: {
              niche: ((bd as unknown as Record<string, unknown>)?.niche as string) ?? 'varejo',
              audience:
                ((bd as unknown as Record<string, unknown>)?.audience as string) ??
                'consumidores gerais',
              positioning:
                ((bd as unknown as Record<string, unknown>)?.positioning as string) ?? '',
              tone: ((bd as unknown as Record<string, unknown>)?.tone as string) ?? 'profissional',
              average_ticket:
                ((bd as unknown as Record<string, unknown>)?.average_ticket as number) ?? 100,
              opportunities:
                ((bd as unknown as Record<string, unknown>)?.opportunities as Array<{
                  title: string
                  description: string
                  estimated_revenue: number
                }>) ?? [],
            },
            products: (prods ?? []) as Array<{ name: string; price: number }>,
            currentDate: new Date(),
            year: new Date().getFullYear(),
          })

          await serviceClient
            .from('tasks' as never)
            .update({
              artifact_data: calendarData,
              artifact_type: 'seasonal-calendar',
              skill_status: 'completed',
              active_skill: 'seasonal-calendar',
              updated_at: new Date().toISOString(),
            } as never)
            .eq('id' as never, taskId)
        } catch {
          await serviceClient
            .from('tasks' as never)
            .update({ skill_status: 'failed', updated_at: new Date().toISOString() } as never)
            .eq('id' as never, taskId)
        }
      })()

      skillContext =
        '\n\n[SKILL RUNNING — O Calendário Sazonal está sendo gerado em segundo plano e aparecerá no painel de entrega ao lado em instantes. Responda ao usuário informando brevemente que o calendário está sendo gerado e que os resultados aparecerão no painel lateral. Seja breve (2-3 frases).]'
    }

    // Inject current artifact data so AI can read/modify it via SNEW_UPDATE_ARTIFACT
    if (!skillContext) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: currentTask } = await (serviceClient as any)
        .from('tasks')
        .select('artifact_type, artifact_data')
        .eq('id', taskId)
        .single()

      if (currentTask?.artifact_data) {
        const summary =
          currentTask.artifact_type === 'seasonal-calendar'
            ? (() => {
                const cal = currentTask.artifact_data as {
                  dates?: Array<{
                    id: string
                    name: string
                    displayDate?: string
                    priority?: string
                  }>
                  year?: number
                  campaigns?: Record<string, unknown>
                }
                const dateNames = (cal.dates ?? [])
                  .map((d) => `${d.name} (${d.displayDate ?? ''})`)
                  .join(', ')
                const campaignCount = Object.keys(cal.campaigns ?? {}).length
                return `Calendário ${cal.year}: ${(cal.dates ?? []).length} datas [${dateNames}], ${campaignCount} campanhas geradas.`
              })()
            : `Artifact type: ${currentTask.artifact_type}`

        // Include date IDs so the AI can reference them in tool calls
        const dateIds =
          currentTask.artifact_type === 'seasonal-calendar'
            ? (
                (currentTask.artifact_data as { dates?: Array<{ id: string; name: string }> })
                  .dates ?? []
              )
                .map((d) => `${d.id} (${d.name})`)
                .join(', ')
            : ''
        skillContext = `\n\n[ARTIFACT CONTEXT — O painel lateral exibe: ${summary}. IDs das datas: ${dateIds}. Para modificar o calendário, use OBRIGATORIAMENTE a tool SNEW_MODIFY_ARTIFACT. Operações disponíveis:
- "filter_dates": manter só as datas listadas em date_ids (remove o resto)
- "remove_dates": remover as datas listadas em date_ids
- "clear_campaigns": limpar campanhas geradas das datas em date_ids. Use except=true para limpar TODAS exceto as listadas
- "generate_campaign": gerar campanha completa (copies, email, assets, video, timeline) para UMA data. Passe date_ids com UM único ID (ex: date_ids=["black-friday-2026"])
NUNCA diga que alterou sem chamar a tool. SEMPRE execute a tool primeiro, depois confirme ao usuário.]`
      }
    }
  }

  // ── 6. Build prompt + process connections (CPU-only, instant) ──────────
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

  const platformTools = buildPlatformTools(
    user.id,
    teamId,
    serviceClient,
    storeId ?? undefined,
    taskId
  )

  // Process Composio connections (CPU-only)
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

  // ── 7. Stream AI ──────────────────────────────────────────────────────
  const agentConfig: AgentConfig = {
    id: 'orchestrator',
    name: 'Snew',
    system_prompt: null,
    model: 'gpt-5.2',
    temperature: null,
    max_tokens: 16384,
  }

  const convId = conversationId

  try {
    const result = await runAgentChat({
      userId: entityId,
      agent: agentConfig,
      messages: modelMessages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
      systemPrompt: orchestratorPrompt + skillContext,
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
    return NextResponse.json(
      { error: safeError('orchestrator-chat', error, 'Chat failed') },
      { status: 500 }
    )
  }
}
