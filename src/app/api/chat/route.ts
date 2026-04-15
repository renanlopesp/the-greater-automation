export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { checkUsageLimits } from '@/lib/billing/usage-check'
import { runAgentsEngine, runAgentsEngineBackground } from '@/lib/chat/engine-agents'
import { runMessagesEngine } from '@/lib/chat/engine-messages'
import { detectMode } from '@/lib/chat/skill-detector'
import { resolveModel } from '@/lib/chat/model-whitelist'
import { isHybridChatEnabled } from '@/lib/chat/feature-flags'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/chat')

/**
 * POST /api/chat — Hybrid chat router.
 *
 * Flow:
 * 1. Auth + team lookup
 * 2. Credit check
 * 3. Parse request body
 * 4. Load active skills
 * 5. Detect mode (skill | chat)
 * 6. Route to the appropriate engine
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const serviceClient = createServiceRoleClient()

  // ── 1. Auth ───────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [body, { data: membership }] = await Promise.all([
    request.json(),
    supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1).single(),
  ])

  if (!membership) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  const teamId = membership.team_id

  // ── 2. Pre-chat credit check ──────────────────────────────────────────
  const usage = await checkUsageLimits(teamId)
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: usage.reason ?? 'Credit limit reached',
        code: 'INSUFFICIENT_CREDITS',
        aiCreditsUsed: usage.aiCreditsUsed,
        aiCreditsLimit: usage.aiCreditsLimit,
      },
      { status: 402 }
    )
  }

  // ── 3. Load active skills for routing decision ────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teamSkills } = await (serviceClient as any)
    .from('skills')
    .select('slug, status')
    .eq('team_id', teamId)

  // ── 4. Detect mode ────────────────────────────────────────────────────
  const decision = detectMode(body, teamSkills ?? [])
  const model = resolveModel(decision.mode === 'chat' ? decision.model : undefined)

  const hybridEnabled = isHybridChatEnabled(teamId)

  let engine: string
  let response: Response

  if (decision.mode === 'skill') {
    // Skill path: get/create task + conversation, respond immediately, fire-and-forget
    engine = 'managed-agents'
    const slug = decision.slug

    // ── Parse user message text ───────────────────────────────────────────
    let userMessage: string = body.message ?? ''
    if (!userMessage && Array.isArray(body.messages)) {
      const lastUser = [...body.messages].reverse().find((m: { role: string }) => m.role === 'user')
      const textPart = lastUser?.parts?.find((p: { type: string }) => p.type === 'text')
      userMessage = textPart ? (textPart as { type: string; text: string }).text : ''
    }

    // ── Get or create task ────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let taskId: string = (body as any).taskId ?? ''
    if (!taskId) {
      const { data: newTask } = await (
        serviceClient as unknown as {
          from: (t: string) => {
            insert: (d: unknown) => {
              select: (s: string) => { single: () => Promise<{ data: { id: string } | null }> }
            }
          }
        }
      )
        .from('tasks')
        .insert({
          team_id: teamId,
          user_id: user.id,
          active_skill: slug,
          skill_status: 'idle',
          title: userMessage.slice(0, 60) || 'New task',
        })
        .select('id')
        .single()
      taskId = newTask?.id ?? ''
    }

    // ── Get or create conversation ────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let conversationId: string = (body as any).conversationId ?? ''
    if (!conversationId) {
      const { data: newConv } = await (
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
          title: userMessage.slice(0, 100) || 'New conversation',
          is_active: true,
        })
        .select('id')
        .single()
      conversationId = newConv?.id ?? ''
    }

    // Link conversation to task if column exists (best-effort)
    if (taskId && conversationId) {
      void (
        serviceClient as unknown as {
          from: (t: string) => { update: (d: unknown) => { eq: (c: string, v: string) => unknown } }
        }
      )
        .from('tasks')
        .update({ conversation_id: conversationId })
        .eq('id', taskId)
    }

    // ── Persist user message ──────────────────────────────────────────────
    if (conversationId && userMessage) {
      void (
        serviceClient as unknown as {
          from: (t: string) => { insert: (d: unknown) => Promise<{ error?: unknown }> }
        }
      )
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: userMessage,
          metadata: { channel: 'web', engine: 'managed-agents', skill: slug },
        })
        .then((r: { error?: unknown }) => {
          if (r?.error) log.error({ err: r.error }, 'Failed to store skill user message')
        })
    }

    // ── Fire-and-forget background skill run ──────────────────────────────
    void runAgentsEngineBackground({
      user: { id: user.id, email: user.email ?? '' },
      teamId,
      taskId,
      conversationId,
      userMessage,
      skillSlug: slug,
    })

    // ── Respond immediately ───────────────────────────────────────────────
    const skillName = slug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    log.info(
      { engine, skill: slug, conversationId, taskId, userId: user.id, teamId },
      'chat dispatched'
    )

    return NextResponse.json(
      { ok: true, taskId, conversationId, skill: slug, message: `Gerando ${skillName}...` },
      {
        status: 200,
        headers: { 'X-Chat-Engine': 'managed-agents' },
      }
    )
  } else if (hybridEnabled) {
    // Chat path with hybrid flag on: use fast Messages API engine
    engine = 'messages-api'
    log.info(
      {
        engine,
        conversationId: body.conversationId,
        taskId: body.taskId,
        userId: user.id,
        teamId,
      },
      'chat dispatched'
    )
    response = await runMessagesEngine({
      user: { id: user.id, email: user.email ?? '' },
      teamId,
      body,
      serviceClient,
      model,
    })
  } else {
    // Legacy path: Managed Agents engine
    engine = 'managed-agents'
    log.info(
      {
        engine,
        conversationId: body.conversationId,
        taskId: body.taskId,
        userId: user.id,
        teamId,
      },
      'chat dispatched'
    )
    const agentResponse = await runAgentsEngine({ user, teamId, body, serviceClient })
    const headers = new Headers(agentResponse.headers)
    headers.set('X-Chat-Engine', 'managed-agents')
    response = new Response(agentResponse.body, { status: agentResponse.status, headers })
  }

  return response
}
