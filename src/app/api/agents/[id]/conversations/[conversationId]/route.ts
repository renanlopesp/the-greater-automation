import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; conversationId: string }> }
) {
  const { id: agentId, conversationId } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS enforces owner/admin role — just attempt the delete
  const { error } = await supabase
    .from('agent_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('agent_id', agentId)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
