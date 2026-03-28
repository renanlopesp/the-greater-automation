import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    approvalId: string
    recipientIds: string[]
    action: 'approve' | 'reject'
  }

  const { approvalId, recipientIds, action } = body

  if (!approvalId || !action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Log the action — actual campaign execution will be wired later
  console.info('[approvals/execute]', {
    userId: user.id,
    approvalId,
    action,
    recipientCount: recipientIds.length,
  })

  return NextResponse.json({
    success: true,
    action,
    recipientCount: recipientIds.length,
  })
}
