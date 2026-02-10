import { NextResponse } from 'next/server'

interface AssistantRequest {
  prompt: string
  currentWorkflow: {
    trigger: { type: string; config: Record<string, unknown> } | null
    steps: { type: string; name: string; config: Record<string, unknown> }[]
    name: string
  }
}

interface SuggestedWorkflow {
  trigger: { type: string; config: Record<string, unknown> }
  steps: { type: string; name: string; config: Record<string, unknown> }[]
}

interface AssistantResponse {
  message: string
  suggestedWorkflow?: SuggestedWorkflow
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<AssistantResponse>> {
  await params
  try {
    const body: AssistantRequest = await request.json()
    const { prompt, currentWorkflow } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ message: 'Invalid prompt provided' }, { status: 400 })
    }

    const lowerPrompt = prompt.toLowerCase()

    // Meeting/briefing workflow
    if (lowerPrompt.includes('meeting') || lowerPrompt.includes('briefing')) {
      return NextResponse.json({
        message:
          "I can help you build a meeting briefing workflow! This workflow will run on a schedule, fetch relevant data via HTTP, and use AI to generate a summary. Here's a suggested structure:",
        suggestedWorkflow: {
          trigger: {
            type: 'scheduled',
            config: {
              schedule: '0 9 * * 1-5',
              timezone: 'UTC',
            },
          },
          steps: [
            {
              type: 'http_request',
              name: 'Fetch calendar events',
              config: {
                method: 'GET',
                url: 'https://api.example.com/calendar/events',
                headers: {},
              },
            },
            {
              type: 'ai',
              name: 'Generate meeting briefing',
              config: {
                provider: 'openai',
                model: 'gpt-4',
                prompt:
                  'Summarize these calendar events and create a briefing: {{step_1.response}}',
              },
            },
            {
              type: 'http_request',
              name: 'Send briefing to Slack',
              config: {
                method: 'POST',
                url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
                headers: { 'Content-Type': 'application/json' },
                body: { text: '{{step_2.output}}' },
              },
            },
          ],
        },
      })
    }

    // Email workflow
    if (lowerPrompt.includes('email')) {
      return NextResponse.json({
        message:
          "I can help you build an email assistant workflow! This workflow uses a webhook trigger to receive emails, processes them with AI, and sends responses. Here's a suggested structure:",
        suggestedWorkflow: {
          trigger: {
            type: 'webhook',
            config: {
              method: 'POST',
              authentication: 'none',
            },
          },
          steps: [
            {
              type: 'ai',
              name: 'Categorize and summarize email',
              config: {
                provider: 'openai',
                model: 'gpt-4',
                prompt:
                  'Categorize this email and create a summary: {{trigger.body.email_content}}',
              },
            },
            {
              type: 'ai',
              name: 'Draft response',
              config: {
                provider: 'openai',
                model: 'gpt-4',
                prompt: 'Draft a professional response to this email: {{step_1.output}}',
              },
            },
            {
              type: 'http_request',
              name: 'Send via email API',
              config: {
                method: 'POST',
                url: 'https://api.example.com/send-email',
                headers: { 'Content-Type': 'application/json' },
                body: { message: '{{step_2.output}}' },
              },
            },
          ],
        },
      })
    }

    // Scraping/monitoring workflow
    if (lowerPrompt.includes('scrape') || lowerPrompt.includes('monitor')) {
      return NextResponse.json({
        message:
          "I can help you build a web monitoring workflow! This workflow runs on a schedule, scrapes a website, and processes the data. Here's a suggested structure:",
        suggestedWorkflow: {
          trigger: {
            type: 'scheduled',
            config: {
              schedule: '0 */4 * * *',
              timezone: 'UTC',
            },
          },
          steps: [
            {
              type: 'web_scraping',
              name: 'Scrape target website',
              config: {
                url: 'https://example.com',
                selector: '.content',
                extractType: 'text',
              },
            },
            {
              type: 'ai',
              name: 'Analyze scraped content',
              config: {
                provider: 'openai',
                model: 'gpt-4',
                prompt: 'Analyze this content for changes or insights: {{step_1.data}}',
              },
            },
            {
              type: 'conditional',
              name: 'Check if action needed',
              config: {
                condition: '{{step_2.output.contains("alert")}}',
              },
            },
          ],
        },
      })
    }

    // Default helpful message
    return NextResponse.json({
      message: `I'm your workflow assistant! I can help you:

• Design workflows from scratch
• Suggest triggers and steps based on your use case
• Optimize existing workflows
• Troubleshoot configuration issues

Tell me what you're trying to automate, and I'll suggest a workflow structure. For example:
- "Build a workflow to monitor competitor websites"
- "Create an email automation for customer support"
- "Set up daily briefings from my calendar"

Current workflow: ${currentWorkflow.name} with ${currentWorkflow.steps.length} step(s)`,
    })
  } catch (error) {
    console.error('Assistant API error:', error)
    return NextResponse.json(
      { message: 'An error occurred processing your request' },
      { status: 500 }
    )
  }
}
