import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { configPatchSchema } from '@/lib/snewclaw/schemas'
import type { Json } from '@/lib/supabase/database.types'

export async function PATCH(
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
  const parsed = configPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Ownership check + fetch current config
  const { data: instance } = await supabase
    .from('snewclaw_instances')
    .select('id, config')
    .eq('id', instanceId)
    .eq('user_id', user.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  // JSON merge patch: merge new config over existing
  const currentConfig = (instance.config ?? {}) as Record<string, unknown>
  const mergedConfig = { ...currentConfig, ...parsed.data.config }

  const serviceSupabase = createServiceRoleClient()
  const { data: updated, error } = await serviceSupabase
    .from('snewclaw_instances')
    .update({ config: mergedConfig as unknown as Json })
    .eq('id', instanceId)
    .select('id, config')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
