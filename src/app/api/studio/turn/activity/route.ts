import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { safeError } from '@/lib/safe-error'

/**
 * POST /api/studio/turn/activity — Persist a single studio "rich" message
 * (image generated, carousel built, style picker, qualification chips) to
 * `conversation_messages`. Inserts ONE row (role='assistant') so it restores
 * exactly once on refresh.
 *
 * Body shapes supported (mutually exclusive; `rich` takes precedence):
 *   - Activity card (legacy, still used for image generated / carousel / etc.):
 *     { conversationId, title, description?, action, suggestions?, imageThumb? }
 *   - Rich message (style picker / qualification chips):
 *     { conversationId, rich: { kind: 'style-picker' | 'qualification', ...fields } }
 *
 * Rich messages are rendered as "answered" (read-only) after a reload since
 * the interactive callbacks are not persisted; the historical UI element
 * stays visible so the conversation reads cleanly.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  const [
    {
      data: { user },
    },
    body,
  ] = await Promise.all([supabase.auth.getUser(), request.json()])

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) return NextResponse.json({ error: 'No team found' }, { status: 400 })

  const conversationId = body?.conversationId as string | undefined
  const rich = body?.rich as
    | { kind: 'style-picker' | 'qualification'; [k: string]: unknown }
    | undefined
  const title = (body?.title as string) ?? ''
  const description = (body?.description as string) ?? ''
  const action = (body?.action as string) ?? 'activity'
  const suggestions = body?.suggestions ?? []
  const imageThumb = (body?.imageThumb as string | undefined) ?? null

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
  }
  if (!rich && !title) {
    return NextResponse.json({ error: 'title is required for activity messages' }, { status: 400 })
  }
  if (rich && rich.kind !== 'style-picker' && rich.kind !== 'qualification') {
    return NextResponse.json({ error: 'unsupported rich.kind' }, { status: 400 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conv } = await (supabase as any)
      .from('conversations')
      .select('id, team_id')
      .eq('id', conversationId)
      .eq('team_id', teamId)
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const richQuestion = rich && typeof rich.question === 'string' ? rich.question : ''
    const content = rich
      ? richQuestion || (rich.kind === 'style-picker' ? 'Escolha um estilo' : 'Selecione uma opção')
      : title + (description ? ` — ${description}` : '')

    const metadata = rich
      ? {
          engine: 'studio-chat',
          rich: {
            kind: rich.kind,
            question: richQuestion,
            chips: Array.isArray(rich.chips) ? rich.chips : undefined,
            styles: Array.isArray(rich.styles) ? rich.styles : undefined,
          },
        }
      : {
          engine: 'studio-chat',
          activity: {
            action,
            title,
            description,
            suggestions,
            imageThumb,
          },
        }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('conversation_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content,
      metadata,
    })

    if (error) {
      return NextResponse.json(
        { error: safeError('studio-activity', error, 'Failed to persist activity') },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('studio-activity', error, 'Failed to persist activity') },
      { status: 500 }
    )
  }
}
