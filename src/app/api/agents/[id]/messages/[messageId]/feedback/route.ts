import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { messageId } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { feedback: string }
  const { feedback } = body

  if (feedback !== 'like' && feedback !== 'dislike') {
    return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 })
  }

  // Check if user already has feedback on this message
  const { data: existing } = await supabase
    .from('message_feedback')
    .select('id, feedback')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .single()

  // Toggle: if same feedback exists, remove it; otherwise upsert
  if (existing?.feedback === feedback) {
    await supabase.from('message_feedback').delete().eq('id', existing.id)
    return NextResponse.json({ feedback: null })
  }

  const { data, error } = await supabase
    .from('message_feedback')
    .upsert(
      { message_id: messageId, user_id: user.id, feedback },
      { onConflict: 'message_id,user_id' }
    )
    .select('feedback')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }

  return NextResponse.json({ feedback: data.feedback })
}
