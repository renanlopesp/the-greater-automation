import { NextRequest, NextResponse, after } from 'next/server'
import { type UIMessage, convertToModelMessages } from 'ai'
import { createServerClient } from '@/lib/supabase/server'
import {
  buildAgentSystemPrompt,
  runAgentChat,
  type AgentConfig,
  type AgentSkill,
  type ConnectedApp,
} from '@/lib/ai/agent-chat'
import { tokensToCredits } from '@/lib/billing/credits'
import { buildSkillBuilderTools } from '@/lib/ai/skill-builder-tools'

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

  // 3. Load agent + skills + knowledge + connections in parallel (all independent)
  const [
    { data: agent },
    { data: skillRows },
    { data: knowledgeSkillRows },
    { data: rpcConnections },
  ] = await Promise.all([
    supabase.from('agents').select('*').eq('id', agentId).single(),
    supabase.from('agent_workflows').select('*').eq('agent_id', agentId),
    supabase
      .from('agent_skills')
      .select('id, name, type, description, is_enabled')
      .eq('agent_id', agentId),
    supabase.rpc('get_agent_available_connections', { p_agent_id: agentId, p_user_id: user.id }),
  ])

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

  // 4. Transform query results
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

  const knowledgeSkills = (knowledgeSkillRows ?? []).map((s) => ({
    name: s.name,
    type: s.type,
    description: s.description,
    is_enabled: s.is_enabled ?? true,
  }))

  const rpcRows = (rpcConnections ?? []) as Array<{ app_id: string; is_own_connection: boolean }>
  const ownConnections = rpcRows.filter((r) => r.is_own_connection)
  const connectedApps: ConnectedApp[] = (ownConnections.length > 0 ? ownConnections : rpcRows).map(
    (conn) => ({
      appId: conn.app_id,
      actions: [],
    })
  )

  // 5. Load or create conversation
  let conversationId = existingConvId
  if (!conversationId) {
    const { data: activeConv } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (activeConv) {
      conversationId = activeConv.id
    } else {
      const { data: conv } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          user_id: user.id,
          created_by: user.id,
          is_active: true,
          title: userMessage.slice(0, 100),
        })
        .select('id')
        .single()
      conversationId = conv?.id
    }
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  // 6. Insert user message to DB for persistence
  await supabase.from('agent_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: userMessage,
    sender_id: user.id,
  })

  // 7. Build messages for the AI model
  let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>

  if (body.messages && Array.isArray(body.messages)) {
    modelMessages = await convertToModelMessages(body.messages as UIMessage[])
  } else {
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

  // 8. Build Relay virtual tools for skill management
  const relayTools = buildSkillBuilderTools(agentId, user.id, agent.team_id)

  // 9. Build system prompt
  const systemPrompt = buildAgentSystemPrompt(
    agentConfig,
    staticSkills,
    connectedApps,
    dynamicSkills,
    knowledgeSkills
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
      relayTools,
    })

    // Persist assistant response + track AI credits after stream completes (non-blocking via after())
    after(async () => {
      try {
        const [fullText, usage] = await Promise.all([result.text, result.usage])

        if (fullText) {
          await supabase.from('agent_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullText,
          })
        }

        // Track AI credits usage for the agent's team
        const credits = tokensToCredits(usage?.totalTokens ?? 0)
        if (credits > 0 && agent.team_id) {
          await supabase.rpc('increment_ai_credits', {
            p_team_id: agent.team_id,
            p_credits: credits,
          })
        }
      } finally {
        await supabase.from('agents').update({ status: 'idle' }).eq('id', agentId)
      }
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
