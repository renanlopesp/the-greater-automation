import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { provisionRequestSchema } from '@/lib/snewclaw/schemas'
import { saveSecret } from '@/lib/snewclaw/secrets'
import {
  createVolume,
  deleteVolume,
  buildMachineConfig,
  createMachine,
  destroyMachine,
  waitForState,
  setupInstance,
  enableChannelPlugins,
  writeChannelConfig,
  restartMachine,
  execCommand,
  type ChannelType,
} from '@/lib/snewclaw/fly-client'

const IMAGE = `registry.fly.io/${process.env.FLY_APP_NAME ?? 'snew-pro-agent'}:latest`

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = provisionRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { llm, messaging, region } = parsed.data

  // Get user's team_id
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const teamId = membership?.team_id
  if (!teamId) {
    return NextResponse.json({ error: 'No team found for user' }, { status: 400 })
  }

  const serviceSupabase = createServiceRoleClient()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(data)))
      }

      let instanceId: string | null = null
      let volumeId: string | null = null
      let machineId: string | null = null

      try {
        // Step 1: Create DB row
        send({ step: 'creating_instance', progress: 5 })
        const { data: instance, error: insertError } = await serviceSupabase
          .from('snewclaw_instances')
          .insert({
            user_id: user.id,
            team_id: teamId,
            status: 'provisioning',
            region: region ?? process.env.FLY_REGION ?? 'gru',
            config: {
              llm: {
                provider: llm.provider,
                model: llm.model,
                ...(llm.baseUrl ? { baseUrl: llm.baseUrl } : {}),
              },
            },
          })
          .select('id')
          .single()

        if (insertError || !instance) {
          send({ step: 'error', error: 'Failed to create instance record' })
          controller.close()
          return
        }
        instanceId = instance.id

        // Step 2: Save encrypted secret
        send({ step: 'saving_secrets', progress: 10 })
        const secretKey =
          llm.provider === 'openai'
            ? 'OPENAI_API_KEY'
            : llm.provider === 'anthropic'
              ? 'ANTHROPIC_API_KEY'
              : 'LLM_API_KEY'
        await saveSecret(user.id, secretKey, llm.apiKey)

        // Step 3: Create volume
        send({ step: 'creating_volume', progress: 20 })
        const volumeName = `openclaw_${instanceId.replace(/-/g, '_').slice(0, 20)}`
        const volume = await createVolume(volumeName, region ?? process.env.FLY_REGION ?? 'gru', 2)
        volumeId = volume.id

        // Step 4: Build machine config
        send({ step: 'building_config', progress: 35 })
        const envVars: Record<string, string> = {
          [secretKey]: llm.apiKey,
        }
        if (llm.baseUrl) {
          envVars['OPENAI_BASE_URL'] = llm.baseUrl
        }
        const machineConfig = buildMachineConfig({
          image: IMAGE,
          env: envVars,
          volumeId,
        })

        // Step 5: Create machine
        send({ step: 'creating_machine', progress: 50 })
        const machineName = `openclaw-${instanceId.slice(0, 8)}`
        const machine = await createMachine(
          machineName,
          region ?? process.env.FLY_REGION ?? 'gru',
          machineConfig
        )
        machineId = machine.id

        // Step 6: Wait for started state
        send({ step: 'waiting_for_start', progress: 65 })
        await waitForState(machineId, 'started', 180)

        // Step 7: Setup instance
        send({ step: 'setting_up_instance', progress: 80 })
        await setupInstance(machineId, llm.provider, llm.model)

        // Step 8: Configure channels (if any)
        // Step 8: Configure channels (if any)
        // Write plugin AND channel config directly to JSON file (no gateway
        // needed). The gateway boots with everything already configured.
        // No waitForGateway or addChannel CLI — pure file writes + restart.
        const channelEntries = Object.entries(messaging ?? {}).filter(
          ([, token]) => token && token.trim()
        )
        if (channelEntries.length > 0) {
          const channelTypes = channelEntries.map(([ch]) => ch as ChannelType)

          send({ step: 'configuring_channels', progress: 85 })
          // Enable plugins in config
          await enableChannelPlugins(machineId, channelTypes)
          // Write channel config (bot tokens, dmPolicy, etc.)
          await writeChannelConfig(
            machineId,
            channelEntries.map(([ch, token]) => ({
              channel: ch as ChannelType,
              token: token as string,
            }))
          )
          await execCommand(machineId, ['chown', '-R', '1000:1000', '/data'], 15)

          // Single restart — gateway boots with plugins + channels ready
          send({ step: 'restarting_gateway', progress: 90 })
          await restartMachine(machineId)

          await serviceSupabase
            .from('snewclaw_instances')
            .update({
              config: {
                llm: {
                  provider: llm.provider,
                  model: llm.model,
                  ...(llm.baseUrl ? { baseUrl: llm.baseUrl } : {}),
                },
                channels: channelEntries.map(([ch]) => ch),
              },
            })
            .eq('id', instanceId)
        }

        // Final permission fix — exec runs as root, gateway runs as node:1000.
        // The gateway creates /data/identity/ on first boot; ensure node owns everything.
        await execCommand(machineId, ['chown', '-R', '1000:1000', '/data'], 15)

        // Step 9: Update DB row to running
        send({ step: 'finalizing', progress: 95 })
        await serviceSupabase
          .from('snewclaw_instances')
          .update({
            status: 'running',
            fly_machine_id: machineId,
            fly_volume_id: volumeId,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', instanceId)

        // Step 9: Log event
        await serviceSupabase.from('snewclaw_events').insert({
          instance_id: instanceId,
          event_type: 'provisioned',
          details: { machine_id: machineId, volume_id: volumeId, provider: llm.provider },
        })

        send({ step: 'done', progress: 100, instanceId })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Provisioning failed'
        console.error('[snewclaw/provision] Error:', message)

        // Best-effort cleanup of Fly resources
        if (machineId) {
          try {
            await destroyMachine(machineId)
          } catch (e) {
            console.error('[snewclaw/provision] cleanup destroyMachine:', e)
          }
        }
        if (volumeId) {
          try {
            await deleteVolume(volumeId)
          } catch (e) {
            console.error('[snewclaw/provision] cleanup deleteVolume:', e)
          }
        }

        // Mark instance as error if it was created
        if (instanceId) {
          await serviceSupabase
            .from('snewclaw_instances')
            .update({ status: 'error', error_message: message })
            .eq('id', instanceId)

          await serviceSupabase.from('snewclaw_events').insert({
            instance_id: instanceId,
            event_type: 'provision_failed',
            details: { error: message },
          })
        }

        send({ step: 'error', error: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
