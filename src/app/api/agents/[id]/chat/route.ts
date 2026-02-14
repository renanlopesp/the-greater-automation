import { NextRequest, NextResponse } from 'next/server'
import { type UIMessage, convertToModelMessages } from 'ai'
import { createServerClient } from '@/lib/supabase/server'
import {
  buildAgentSystemPrompt,
  runAgentChat,
  type AgentConfig,
  type AgentSkill,
  type ConnectedApp,
} from '@/lib/ai/agent-chat'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = await params
  const supabase = await createServerClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse request body — supports both useChat format and legacy format
  const body = await request.json()
  let userMessage: string
  const existingConvId = body.conversationId as string | undefined

  if (body.messages && Array.isArray(body.messages)) {
    // Vercel AI SDK useChat format: { messages: UIMessage[], conversationId? }
    const msgs = body.messages as UIMessage[]
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user')
    if (!lastUser) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }
    // Extract text content from UIMessage parts
    const textPart = lastUser.parts?.find((p) => p.type === 'text')
    userMessage = textPart ? (textPart as { type: 'text'; text: string }).text : ''
  } else {
    // Legacy format: { message: string, conversationId? }
    userMessage = body.message as string
  }

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  if (existingConvId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(existingConvId)) {
      return NextResponse.json({ error: 'Invalid conversationId format' }, { status: 400 })
    }
  }

  // 3. Load agent config
  const { data: agent } = await supabase.from('agents').select('*').eq('id', agentId).single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const agentConfig: AgentConfig = {
    id: agent.id,
    name: agent.name,
    system_prompt: agent.system_prompt,
    model: agent.model,
    temperature: agent.temperature,
    max_tokens: agent.max_tokens,
  }

  // 4. Load or create conversation
  let conversationId = existingConvId
  if (!conversationId) {
    const { data: conv } = await supabase
      .from('agent_conversations')
      .insert({
        agent_id: agentId,
        user_id: user.id,
        title: userMessage.slice(0, 100),
      })
      .select('id')
      .single()
    conversationId = conv?.id
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  // 5. Insert user message to DB for persistence
  await supabase.from('agent_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: userMessage,
  })

  // 6. Build messages for the AI model
  let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>

  if (body.messages && Array.isArray(body.messages)) {
    // Convert UIMessages from client to model messages
    modelMessages = await convertToModelMessages(body.messages as UIMessage[])
  } else {
    // Load from DB for legacy format
    const { data: historyRows } = await supabase
      .from('agent_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50)

    modelMessages = (historyRows ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
  }

  // 7. Load agent skills
  const { data: skillRows } = await supabase
    .from('agent_skills')
    .select('*')
    .eq('agent_id', agentId)

  const allSkills: AgentSkill[] = (skillRows ?? []).map((s) => ({
    name: s.name,
    description: s.description,
    source: s.source,
    action_template: s.action_template as Record<string, unknown> | null,
    workflow_name: null,
    workflow_description: null,
  }))

  const staticSkills = allSkills.filter((s) => s.source !== 'dynamic')
  const dynamicSkills = allSkills.filter((s) => s.source === 'dynamic')

  // 8. Load connected apps for system prompt context
  const { data: appConnections } = await supabase
    .from('app_connections')
    .select('app_id')
    .eq('user_id', user.id)

  const connectedApps: ConnectedApp[] = (appConnections ?? []).map((conn) => ({
    appId: conn.app_id,
    actions: [],
  }))

  // 9. Build system prompt
  const systemPrompt = buildAgentSystemPrompt(
    agentConfig,
    staticSkills,
    connectedApps,
    dynamicSkills
  )

  // 10. Update agent status to 'running'
  await supabase.from('agents').update({ status: 'running' }).eq('id', agentId)

  // 11. Run agent chat with Vercel AI SDK + Composio tools
  try {
    const result = await runAgentChat({
      userId: user.id,
      agent: agentConfig,
      messages: modelMessages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
      systemPrompt,
    })

    // Persist assistant response after stream completes (fire and forget)
    Promise.resolve(result.text)
      .then(async (fullText) => {
        if (fullText) {
          await supabase.from('agent_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullText,
          })
        }
        await supabase.from('agents').update({ status: 'idle' }).eq('id', agentId)
      })
      .catch(async () => {
        await supabase.from('agents').update({ status: 'idle' }).eq('id', agentId)
      })

    // Return streaming response with conversation ID header
    const response = result.toUIMessageStreamResponse()
    const headers = new Headers(response.headers)
    headers.set('X-Conversation-Id', conversationId)

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error) {
    await supabase.from('agents').update({ status: 'idle' }).eq('id', agentId)
    const errorMessage = error instanceof Error ? error.message : 'Chat failed'
    console.error('[agent-chat] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
