import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getActiveTeamId } from '@/lib/get-active-team'
import { safeError } from '@/lib/safe-error'

/**
 * POST /api/studio/turn — Persist a studio chat turn (user + assistant) to
 * conversation_messages. Used by StudioChatPanel after each studio-chat round
 * trip so canvas-mode conversations survive refresh.
 *
 * Body: { conversationId, userMessage, assistantMessage, metadata? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  const [
    {
      data: { user },
    },
    body,
  ] = await Promise.all([supabase.auth.getUser(), request.json()])

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teamId = await getActiveTeamId(supabase, user.id)
  if (!teamId) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  const conversationId = body?.conversationId as string | undefined
  const userMessage = body?.userMessage as string | undefined
  const assistantMessage = body?.assistantMessage as string | undefined
  const metadata = (body?.metadata ?? {}) as Record<string, unknown>

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
  }
  if (
    (typeof userMessage !== 'string' || userMessage.length === 0) &&
    (typeof assistantMessage !== 'string' || assistantMessage.length === 0)
  ) {
    return NextResponse.json({ error: 'userMessage or assistantMessage required' }, { status: 400 })
  }

  try {
    // Verify the conversation belongs to this team via RLS-scoped read.
    // Using the user-scoped client ensures RLS is enforced in depth — if the
    // user isn't a member of the team that owns this conversation, the select
    // returns null.
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

    const now = new Date().toISOString()
    const rows: Array<Record<string, unknown>> = []
    if (typeof userMessage === 'string' && userMessage.length > 0) {
      rows.push({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        metadata: { engine: 'studio-chat', ...metadata },
        created_at: now,
      })
    }
    if (typeof assistantMessage === 'string' && assistantMessage.length > 0) {
      rows.push({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage,
        metadata: { engine: 'studio-chat', ...metadata },
        created_at: new Date(Date.now() + 1).toISOString(),
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('conversation_messages').insert(rows)

    if (error) {
      return NextResponse.json(
        { error: safeError('studio-turn', error, 'Failed to persist turn') },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, inserted: rows.length })
  } catch (error) {
    return NextResponse.json(
      { error: safeError('studio-turn', error, 'Failed to persist turn') },
      { status: 500 }
    )
  }
}
