import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createServerClient } from '@/lib/supabase/server'
import {
  buildWorkflowAssistantPrompt,
  suggestWorkflowTool,
  type WorkflowAssistantContext,
} from '@/lib/ai/workflow-assistant'

function getOpenAIProvider() {
  const apiKey = process.env.OPEN_AI_API_KEY
  if (!apiKey) {
    throw new Error('OPEN_AI_API_KEY environment variable is required')
  }
  return createOpenAI({ apiKey })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: workflowId } = await params

  // Auth check — prevent unauthenticated OpenAI credit consumption
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const { messages, workflowContext } = body as {
      messages: UIMessage[]
      workflowContext?: {
        workflowName: string
        trigger: WorkflowAssistantContext['trigger']
        steps: WorkflowAssistantContext['steps']
      }
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const context: WorkflowAssistantContext = {
      workflowId,
      workflowName: workflowContext?.workflowName ?? 'Untitled',
      trigger: workflowContext?.trigger ?? null,
      steps: workflowContext?.steps ?? [],
    }

    const systemPrompt = buildWorkflowAssistantPrompt(context)
    const provider = getOpenAIProvider()

    // Convert UIMessage[] to model messages (same pattern as agent chat)
    const modelMessages = await convertToModelMessages(messages)

    const result = streamText({
      model: provider.chat('gpt-4o'),
      system: systemPrompt,
      messages: modelMessages,
      tools: {
        SUGGEST_WORKFLOW: suggestWorkflowTool,
      },
      stopWhen: stepCountIs(3),
      temperature: 0.7,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Workflow assistant error:', error)
    return new Response(JSON.stringify({ error: 'Failed to process assistant request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
