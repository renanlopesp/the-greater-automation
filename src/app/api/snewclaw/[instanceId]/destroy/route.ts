import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { destroyMachine, deleteVolume } from '@/lib/snewclaw/fly-client'

export async function DELETE(
  _request: NextRequest,
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

  // Ownership check
  const { data: instance } = await supabase
    .from('snewclaw_instances')
    .select('id, fly_machine_id, fly_volume_id, status')
    .eq('id', instanceId)
    .eq('user_id', user.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  const serviceSupabase = createServiceRoleClient()

  // Mark as destroying
  await serviceSupabase
    .from('snewclaw_instances')
    .update({ status: 'destroying' })
    .eq('id', instanceId)

  // Destroy machine (best effort)
  if (instance.fly_machine_id) {
    try {
      await destroyMachine(instance.fly_machine_id)
    } catch (err) {
      console.error('[snewclaw/destroy] destroyMachine error:', err)
    }
  }

  // Delete volume (best effort)
  if (instance.fly_volume_id) {
    try {
      await deleteVolume(instance.fly_volume_id)
    } catch (err) {
      console.error('[snewclaw/destroy] deleteVolume error:', err)
    }
  }

  // Log event before deleting row
  await serviceSupabase.from('snewclaw_events').insert({
    instance_id: instanceId,
    event_type: 'destroyed',
    details: {
      machine_id: instance.fly_machine_id,
      volume_id: instance.fly_volume_id,
    },
  })

  // Delete DB row
  await serviceSupabase.from('snewclaw_instances').delete().eq('id', instanceId)

  return NextResponse.json({ success: true })
}
