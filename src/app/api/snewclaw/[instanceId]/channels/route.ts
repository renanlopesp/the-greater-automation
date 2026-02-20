import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { channelAddSchema, channelRemoveSchema } from '@/lib/snewclaw/schemas'
import {
  removeChannel,
  listChannels,
  enableChannelPlugins,
  writeChannelConfig,
  restartMachine,
  execCommand,
  type ChannelType,
} from '@/lib/snewclaw/fly-client'

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

  const instance = await getAuthedInstance(supabase, instanceId, user.id)
  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }
  if (instance.status !== 'running' || !instance.fly_machine_id) {
    return NextResponse.json({ error: 'Instance is not running' }, { status: 409 })
  }

  const output = await listChannels(instance.fly_machine_id)
  return NextResponse.json({ channels: output })
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
  const parsed = channelAddSchema.safeParse(body)
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
    const ch = parsed.data.channel as ChannelType
    // Write plugin + channel config directly to JSON file (no gateway needed)
    await enableChannelPlugins(instance.fly_machine_id, [ch])
    await writeChannelConfig(instance.fly_machine_id, [{ channel: ch, token: parsed.data.token }])
    await execCommand(instance.fly_machine_id, ['chown', '-R', '1000:1000', '/data'], 15)
    // Restart so gateway boots with plugin + channel already configured
    await restartMachine(instance.fly_machine_id)
    return NextResponse.json({ ok: true, channel: parsed.data.channel })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add channel'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function DELETE(
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
  const parsed = channelRemoveSchema.safeParse(body)
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
    await removeChannel(instance.fly_machine_id, parsed.data.channel as ChannelType)
    return NextResponse.json({ ok: true, channel: parsed.data.channel })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove channel'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
