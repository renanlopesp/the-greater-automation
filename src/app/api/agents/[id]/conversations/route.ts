import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') ?? '1', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 50)
  const offset = (page - 1) * limit

  const { data: conversations, count } = await supabase
    .from('agent_conversations')
    .select('*', { count: 'exact' })
    .eq('agent_id', agentId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!conversations) {
    return NextResponse.json({ conversations: [], total: 0, page, limit })
  }

  const convIds = conversations.map((c) => c.id)

  const [{ data: messageData }, { data: countData }] = await Promise.all([
    supabase
      .from('agent_messages')
      .select('conversation_id, sender_id')
      .in('conversation_id', convIds)
      .not('sender_id', 'is', null),
    supabase.from('agent_messages').select('conversation_id').in('conversation_id', convIds),
  ])

  const senderIds = [...new Set((messageData ?? []).map((m) => m.sender_id).filter(Boolean))]
  const creatorIds = [...new Set(conversations.map((c) => c.created_by).filter(Boolean))]
  const allProfileIds = [...new Set([...senderIds, ...creatorIds])] as string[]

  const profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
  if (allProfileIds.length > 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', allProfileIds)
    for (const p of profileData ?? []) {
      profiles[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }
    }
  }

  const msgCounts: Record<string, number> = {}
  for (const m of countData ?? []) {
    msgCounts[m.conversation_id] = (msgCounts[m.conversation_id] ?? 0) + 1
  }

  const participantMap: Record<string, Set<string>> = {}
  for (const m of messageData ?? []) {
    if (m.sender_id) {
      if (!participantMap[m.conversation_id]) participantMap[m.conversation_id] = new Set()
      participantMap[m.conversation_id].add(m.sender_id)
    }
  }

  const result = conversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
    createdBy: conv.created_by
      ? {
          id: conv.created_by,
          fullName: profiles[conv.created_by]?.full_name ?? null,
          avatarUrl: profiles[conv.created_by]?.avatar_url ?? null,
        }
      : null,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
    isActive: conv.is_active,
    messageCount: msgCounts[conv.id] ?? 0,
    participants: [...(participantMap[conv.id] ?? [])].map((sid) => ({
      id: sid,
      fullName: profiles[sid]?.full_name ?? null,
      avatarUrl: profiles[sid]?.avatar_url ?? null,
    })),
  }))

  return NextResponse.json({
    conversations: result,
    total: count ?? 0,
    page,
    limit,
  })
}
