import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { pairingApproveSchema } from '@/lib/snewclaw/schemas'
import { listPairingRequests, approvePairing, type ChannelType } from '@/lib/snewclaw/fly-client'

async function getAuthedInstance(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  instanceId: string,
  userId: string
) {
  const { data: instance } = await supabase
    .from('snewclaw_instances')
    .select('id, fly_machine_id, status')
    .eq('id', instanceId)
    .eq('user_id', userId)
    .single()
  return instance
}

export async function GET(
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

  const instance = await getAuthedInstance(supabase, instanceId, user.id)
  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }
  if (instance.status !== 'running' || !instance.fly_machine_id) {
    return NextResponse.json({ error: 'Instance is not running' }, { status: 409 })
  }

  const channel = (request.nextUrl.searchParams.get('channel') ?? 'telegram') as ChannelType

  try {
    const output = await listPairingRequests(instance.fly_machine_id, channel)
    return NextResponse.json({ pending: output })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list pairing requests'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function POST(
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

  const body = await request.json()
  const parsed = pairingApproveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const instance = await getAuthedInstance(supabase, instanceId, user.id)
  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }
  if (instance.status !== 'running' || !instance.fly_machine_id) {
    return NextResponse.json({ error: 'Instance is not running' }, { status: 409 })
  }

  try {
    const output = await approvePairing(
      instance.fly_machine_id,
      parsed.data.channel,
      parsed.data.code
    )
    return NextResponse.json({ ok: true, output })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to approve pairing'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
