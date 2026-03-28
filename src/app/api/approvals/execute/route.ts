import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/approvals/execute')

const ApprovalsExecuteSchema = z.object({
  approvalId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  recipientIds: z.array(z.string()).optional().default([]),
})

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawBody = await request.json().catch(() => null)
  if (!rawBody) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = ApprovalsExecuteSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: Object.keys(parsed.error.flatten().fieldErrors) },
      { status: 400 }
    )
  }
  const { approvalId, recipientIds, action } = parsed.data

  // Log the action — actual campaign execution will be wired later
  log.info(
    { userId: user.id, approvalId, action, recipientCount: recipientIds.length },
    'Approval action executed'
  )

  return NextResponse.json({
    success: true,
    action,
    recipientCount: recipientIds.length,
  })
}
