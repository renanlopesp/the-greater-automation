import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getMachine } from '@/lib/snewclaw/fly-client'

export async function GET(
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
    .select('*')
    .eq('id', instanceId)
    .eq('user_id', user.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  // If running and has machine ID, sync with Fly state
  if (instance.status === 'running' && instance.fly_machine_id) {
    try {
      const machine = await getMachine(instance.fly_machine_id)

      // If Fly reports a different state, sync it
      if (machine.state !== 'started') {
        const serviceSupabase = createServiceRoleClient()
        const flyStatus = machine.state === 'stopped' ? 'stopped' : 'error'
        await serviceSupabase
          .from('snewclaw_instances')
          .update({ status: flyStatus })
          .eq('id', instanceId)

        return NextResponse.json({ ...instance, status: flyStatus, fly_state: machine.state })
      }
    } catch (err) {
      console.error('[snewclaw/status] getMachine error:', err)
      // Continue returning DB state on Fly API error
    }
  }

  return NextResponse.json(instance)
}
