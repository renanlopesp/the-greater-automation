import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { chatMessageSchema } from '@/lib/snewclaw/schemas'
import { sendChatMessage } from '@/lib/snewclaw/fly-client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate body
  const body = await request.json()
  const parsed = chatMessageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { content, sessionId: providedSessionId } = parsed.data

  // Ownership check + require running status
  const { data: instance } = await supabase
    .from('snewclaw_instances')
    .select('id, fly_machine_id, status')
    .eq('id', instanceId)
    .eq('user_id', user.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }
  if (instance.status !== 'running') {
    return NextResponse.json({ error: 'Instance is not running' }, { status: 409 })
  }
  if (!instance.fly_machine_id) {
    return NextResponse.json({ error: 'Instance has no machine ID' }, { status: 500 })
  }

  const sessionId = providedSessionId ?? crypto.randomUUID()
  const serviceSupabase = createServiceRoleClient()

  // Persist user message
  const { data: userMessage } = await serviceSupabase
    .from('snewclaw_messages')
    .insert({
      instance_id: instanceId,
      user_id: user.id,
      role: 'user',
      content,
    })
    .select('id, role, content, metadata, created_at')
    .single()

  // Send to OpenClaw via exec
  let chatResponse: Awaited<ReturnType<typeof sendChatMessage>>
  try {
    chatResponse = await sendChatMessage(instance.fly_machine_id, content, sessionId, 30)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed'
    console.error('[snewclaw/chat] sendChatMessage error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Extract assistant text from payloads
  const assistantText = chatResponse.payloads
    .map((p) => p.text ?? '')
    .filter(Boolean)
    .join('\n')

  // Persist assistant response
  const { data: assistantMessage } = await serviceSupabase
    .from('snewclaw_messages')
    .insert({
      instance_id: instanceId,
      user_id: user.id,
      role: 'assistant',
      content: assistantText,
      metadata: {
        durationMs: chatResponse.meta.durationMs,
        agentMeta: chatResponse.meta.agentMeta,
      },
    })
    .select('id, role, content, metadata, created_at')
    .single()

  // Update last_activity_at
  await serviceSupabase
    .from('snewclaw_instances')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', instanceId)

  return NextResponse.json({
    sessionId,
    userMessage,
    assistantMessage,
    meta: chatResponse.meta,
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ownership check
  const { data: instance } = await supabase
    .from('snewclaw_instances')
    .select('id')
    .eq('id', instanceId)
    .eq('user_id', user.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)
  const before = searchParams.get('before')

  let query = supabase
    .from('snewclaw_messages')
    .select('id, role, content, metadata, created_at')
    .eq('instance_id', instanceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    // Cursor-based pagination: get created_at of the cursor message
    const { data: cursor } = await supabase
      .from('snewclaw_messages')
      .select('created_at')
      .eq('id', before)
      .single()

    if (cursor) {
      query = query.lt('created_at', cursor.created_at)
    }
  }

  const { data: messages, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    messages: (messages ?? []).reverse(),
    hasMore: (messages ?? []).length === limit,
  })
}
