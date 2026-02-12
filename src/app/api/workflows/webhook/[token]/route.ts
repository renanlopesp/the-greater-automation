import { createServiceClient } from '@/lib/supabase/service'
import { handleWebhookRequest } from '@/lib/workflow-editor/webhook-executor'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function handler(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  try {
    const { token } = await params

    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const result = await handleWebhookRequest(token, request, supabase)

    return Response.json(result.body, { status: result.status })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Export all HTTP methods
export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const HEAD = handler
export const OPTIONS = handler
