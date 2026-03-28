import { createServiceClient } from '@/lib/supabase/service'
import { handleWebhookRequest } from '@/lib/workflow-editor/webhook-executor'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/workflows/webhook')

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
    log.error({ err: error }, 'Webhook handler error')
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
