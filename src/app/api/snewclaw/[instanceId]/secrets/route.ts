import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { secretsUpdateSchema } from '@/lib/snewclaw/schemas'
import { saveSecret, getDecryptedSecrets } from '@/lib/snewclaw/secrets'
import { updateMachineEnv, removeMachineEnvKeys } from '@/lib/snewclaw/fly-client'

/**
 * All saved secrets are applied as machine env vars.
 * OpenClaw reads API keys, bot tokens, and config from process.env.
 */

/** GET: List saved secret keys (not values) for this instance's owner. */
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
    .select('id')
    .eq('id', instanceId)
    .eq('user_id', user.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  // Fetch secret keys only (never return values)
  const serviceSupabase = createServiceRoleClient()
  const { data: secrets } = await serviceSupabase
    .from('snewclaw_secrets')
    .select('key, updated_at')
    .eq('user_id', user.id)
    .order('key')

  return NextResponse.json({
    secrets: (secrets ?? []).map((s) => ({ key: s.key, updatedAt: s.updated_at })),
  })
}

/** DELETE: Remove a secret by key. */
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
  const key = typeof body?.key === 'string' ? body.key : ''
  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 })
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

  const serviceSupabase = createServiceRoleClient()
  await serviceSupabase.from('snewclaw_secrets').delete().eq('user_id', user.id).eq('key', key)

  // If machine is running, remove the env var and restart
  const { data: inst } = await supabase
    .from('snewclaw_instances')
    .select('fly_machine_id, status')
    .eq('id', instanceId)
    .eq('user_id', user.id)
    .single()

  if (inst?.status === 'running' && inst.fly_machine_id) {
    try {
      await removeMachineEnvKeys(inst.fly_machine_id, [key])
      // No need to call restartMachine — Fly's POST /machines/{id} already
      // restarts the machine when the config is updated.
    } catch (err) {
      console.error('[snewclaw/secrets] delete sync error:', err)
    }
  }

  return NextResponse.json({ success: true })
}

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

  const body = await request.json()
  const parsed = secretsUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Ownership check + get machine info
  const { data: instance } = await supabase
    .from('snewclaw_instances')
    .select('id, fly_machine_id, status')
    .eq('id', instanceId)
    .eq('user_id', user.id)
    .single()

  if (!instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
  }

  // Save each secret encrypted in Supabase
  for (const { key, value } of parsed.data.secrets) {
    await saveSecret(user.id, key, value)
  }

  // If machine is running, push ALL secrets as env vars and restart
  if (instance.status === 'running' && instance.fly_machine_id) {
    try {
      // Fetch ALL decrypted secrets (not just the ones from this request)
      // so the machine always has the complete set of env vars
      const allSecrets = await getDecryptedSecrets(user.id)

      if (Object.keys(allSecrets).length > 0) {
        await updateMachineEnv(instance.fly_machine_id, allSecrets)
        // No need to call restartMachine — Fly's POST /machines/{id} already
        // restarts the machine when the config is updated.
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply secrets'
      console.error('[snewclaw/secrets] apply error:', message)
      return NextResponse.json({ success: true, applied: false, error: message }, { status: 200 })
    }
  }

  return NextResponse.json({ success: true, applied: true })
}
