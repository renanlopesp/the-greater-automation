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
} from '@/lib/snewclaw/fly-client'

import crypto from 'node:crypto'

const IMAGE = 'registry.fly.io/snew-snewclaw:latest'

function generateGatewayPassword(): string {
  return crypto.randomBytes(16).toString('hex')
}

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
  const { llm, region } = parsed.data

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
        const gatewayPassword = generateGatewayPassword()
        const envVars: Record<string, string> = {
          [secretKey]: llm.apiKey,
          OPENCLAW_GATEWAY_PASSWORD: gatewayPassword,
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

        // Step 8: Update DB row to running
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
