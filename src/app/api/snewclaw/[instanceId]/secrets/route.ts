import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { secretsUpdateSchema } from '@/lib/snewclaw/schemas'
import { saveSecret } from '@/lib/snewclaw/secrets'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate body
  const body = await request.json()
  const parsed = secretsUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Ownership check
  const { data: instance } = await supabase
    .from('snewclaw_instances')
    .select('id')
    .eq('id', instanceId)
    .eq('user_id', user.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  // Save each secret
  for (const { key, value } of parsed.data.secrets) {
    await saveSecret(user.id, key, value)
  }

  return NextResponse.json({ success: true })
}
