import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { safeError } from '@/lib/safe-error'

/**
 * POST /api/studio/turn/activity — Persist a single studio activity message
 * (image generated, carousel built, etc.) to `conversation_messages`. Inserts
 * ONE row (role='assistant') so it restores exactly once on refresh.
 *
 * Body: { conversationId, title, description?, action, suggestions?, imageThumb? }
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
  const title = (body?.title as string) ?? ''
  const description = (body?.description as string) ?? ''
  const action = (body?.action as string) ?? 'activity'
  const suggestions = body?.suggestions ?? []
  const imageThumb = (body?.imageThumb as string | undefined) ?? null

  if (!conversationId || !title) {
    return NextResponse.json({ error: 'conversationId and title are required' }, { status: 400 })
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('conversation_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: title + (description ? ` — ${description}` : ''),
      metadata: {
        engine: 'studio-chat',
        activity: {
          action,
          title,
          description,
          suggestions,
          imageThumb,
        },
      },
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
